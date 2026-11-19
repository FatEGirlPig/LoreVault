-- LoreVault initial schema. Every user-owned table has RLS enabled.
-- Tables that only the server may change (quotas, usage, subscriptions, secrets)
-- have no user write policies; they are written with the service role.

create extension if not exists pgcrypto;

create type visibility as enum ('private', 'friends', 'public');
create type plan_tier as enum ('free', 'plus', 'pro', 'ultimate');
create type data_source as enum ('manual', 'import', 'sync');
create type media_category as enum ('screenshot', 'video', 'note', 'document', 'other');

-- ---------- Profiles & privacy ----------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 50),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table privacy_settings (
  user_id uuid primary key references auth.users on delete cascade,
  library visibility not null default 'private',
  connected_accounts visibility not null default 'private',
  media_default visibility not null default 'private',
  notes visibility not null default 'private',
  collections_default visibility not null default 'private',
  friends_list visibility not null default 'private',
  activity visibility not null default 'private',
  updated_at timestamptz not null default now()
);

-- ---------- Social ----------
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users on delete cascade,
  addressee_id uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index friendships_pair on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table blocks (
  blocker_id uuid not null references auth.users on delete cascade,
  blocked_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table follows (
  follower_id uuid not null references auth.users on delete cascade,
  followee_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users on delete cascade,
  reported_user_id uuid references auth.users on delete set null,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now()
);

-- Helpers (security definer so they can read across owners without exposing rows)
create or replace function is_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships f where f.status = 'accepted'
    and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a)));
$$;

create or replace function is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- Can the current user view a resource owned by `owner` with visibility `vis`?
create or replace function can_view(owner uuid, vis visibility) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() = owner then true
    when auth.uid() is not null and is_blocked(auth.uid(), owner) then false
    when vis = 'public' then true
    when vis = 'friends' then auth.uid() is not null and is_friend(auth.uid(), owner)
    else false end;
$$;

-- ---------- Games & library ----------
create table games (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  platform text not null,                 -- steam, playstation, xbox, gog, epic, nintendo, other
  external_id text,                       -- platform game id (e.g. Steam appid)
  cover_url text,
  source data_source not null default 'manual',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create unique index games_platform_external on games (platform, external_id) where external_id is not null;
create index games_title on games using gin (to_tsvector('simple', title));

create table user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  game_id uuid not null references games on delete cascade,
  platform text not null,
  source data_source not null,
  connected_account_id uuid,
  status text not null default 'unplayed' check (status in ('unplayed', 'playing', 'completed', 'dropped', 'wishlist')),
  playtime_minutes integer check (playtime_minutes >= 0),   -- only set when the integration supplies it
  rating smallint check (rating between 1 and 10),
  notes text check (char_length(notes) <= 10000),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id, platform)     -- makes imports idempotent
);
create index user_games_user on user_games (user_id);

create table collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  is_wishlist boolean not null default false,
  visibility visibility not null default 'private',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index collections_user on collections (user_id);

create table collection_games (
  collection_id uuid not null references collections on delete cascade,
  game_id uuid not null references games on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, game_id)
);

-- ---------- Connections & sync ----------
create table connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform text not null,
  external_user_id text not null,
  display_name text,
  status text not null default 'connected' check (status in ('connected', 'error', 'revoked')),
  granted_permissions text[] not null default '{}',
  available_data text[] not null default '{}',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, platform),
  unique (platform, external_user_id)
);
alter table user_games add constraint user_games_account_fk foreign key (connected_account_id) references connected_accounts on delete set null;

-- Encrypted tokens: no RLS policies => only the service role can read/write.
create table connected_account_secrets (
  account_id uuid primary key references connected_accounts on delete cascade,
  encrypted_tokens text not null,
  updated_at timestamptz not null default now()
);

create table game_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid not null references connected_accounts on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempt integer not null default 1,
  games_imported integer not null default 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index sync_jobs_user on game_sync_jobs (user_id, created_at desc);

-- ---------- Vault & storage ----------
create table media_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  object_key text not null unique,
  filename text not null check (char_length(filename) between 1 and 255),
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  category media_category not null,
  folder text check (char_length(folder) <= 100),
  game_id uuid references games on delete set null,
  visibility visibility not null default 'private',
  status text not null default 'pending' check (status in ('pending', 'ready')),
  created_at timestamptz not null default now()
);
create index media_owner on media_files (owner_id, created_at desc);

create table storage_quotas (
  user_id uuid primary key references auth.users on delete cascade,
  plan plan_tier not null default 'free',
  base_bytes bigint not null default 10737418240,  -- 10 GB
  addon_bytes bigint not null default 0,
  grace_until timestamptz,                          -- set when a downgrade leaves the user over quota
  updated_at timestamptz not null default now()
);

create table storage_usage (
  user_id uuid primary key references auth.users on delete cascade,
  used_bytes bigint not null default 0,
  by_category jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- Billing ----------
create table subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan plan_tier not null default 'free',
  interval text check (interval in ('month', 'year')),
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table storage_addons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  stripe_subscription_item_id text unique,
  bytes bigint not null check (bytes > 0),
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- ---------- Activity & audit ----------
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  visibility visibility not null default 'private',
  created_at timestamptz not null default now()
);
create index activity_user on activity_events (user_id, created_at desc);

create table audit_logs (
  id bigserial primary key,
  user_id uuid references auth.users on delete set null,
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- Triggers ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  insert into privacy_settings (user_id) values (new.id);
  insert into storage_quotas (user_id) values (new.id);
  insert into storage_usage (user_id) values (new.id);
  insert into subscriptions (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Recalculate usage from ready files whenever media changes (server-side source of truth).
create or replace function recalc_storage_usage() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := coalesce(new.owner_id, old.owner_id);
begin
  update storage_usage su set
    used_bytes = coalesce(t.total, 0),
    by_category = coalesce(t.cats, '{}'),
    updated_at = now()
  from (
    select sum(s) as total, jsonb_object_agg(category, s) as cats
    from (select category, sum(size_bytes) s from media_files
          where owner_id = uid and status = 'ready' group by category) x
  ) t
  where su.user_id = uid;
  return null;
end $$;
create trigger media_usage after insert or update or delete on media_files for each row execute function recalc_storage_usage();

-- Stop users editing columns they must not control (source, sync fields) on their own rows.
create or replace function protect_user_game_fields() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    new.source := old.source; new.platform := old.platform; new.game_id := old.game_id;
    new.connected_account_id := old.connected_account_id; new.last_synced_at := old.last_synced_at;
    if old.source <> 'manual' then new.playtime_minutes := old.playtime_minutes; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger user_games_protect before update on user_games for each row execute function protect_user_game_fields();

create or replace function protect_media_fields() returns trigger language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    new.object_key := old.object_key; new.size_bytes := old.size_bytes; new.content_type := old.content_type;
    new.status := old.status; new.owner_id := old.owner_id;
  end if;
  return new;
end $$;
create trigger media_protect before update on media_files for each row execute function protect_media_fields();

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table privacy_settings enable row level security;
alter table friendships enable row level security;
alter table blocks enable row level security;
alter table follows enable row level security;
alter table reports enable row level security;
alter table games enable row level security;
alter table user_games enable row level security;
alter table collections enable row level security;
alter table collection_games enable row level security;
alter table connected_accounts enable row level security;
alter table connected_account_secrets enable row level security;
alter table game_sync_jobs enable row level security;
alter table media_files enable row level security;
alter table storage_quotas enable row level security;
alter table storage_usage enable row level security;
alter table subscriptions enable row level security;
alter table storage_addons enable row level security;
alter table activity_events enable row level security;
alter table audit_logs enable row level security;

create policy profiles_read on profiles for select using (can_view(id, visibility));
create policy profiles_update on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy privacy_own on privacy_settings for select using (auth.uid() = user_id);
create policy privacy_update on privacy_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy friendships_read on friendships for select using (auth.uid() in (requester_id, addressee_id));
create policy friendships_request on friendships for insert with check (
  auth.uid() = requester_id and status = 'pending' and not is_blocked(requester_id, addressee_id));
create policy friendships_accept on friendships for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);
create policy friendships_delete on friendships for delete using (auth.uid() in (requester_id, addressee_id));

create policy blocks_own on blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy follows_own on follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy follows_read on follows for select using (auth.uid() = followee_id);
create policy reports_create on reports for insert with check (auth.uid() = reporter_id);

create policy games_read on games for select using (true);
create policy games_manual_insert on games for insert with check (auth.uid() = created_by and source = 'manual' and external_id is null);

create policy user_games_read on user_games for select using (
  can_view(user_id, (select library from privacy_settings p where p.user_id = user_games.user_id)));
create policy user_games_insert on user_games for insert with check (auth.uid() = user_id and source = 'manual' and connected_account_id is null);
create policy user_games_update on user_games for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_games_delete on user_games for delete using (auth.uid() = user_id and source = 'manual');

create policy collections_read on collections for select using (can_view(user_id, visibility));
create policy collections_write on collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy collection_games_read on collection_games for select using (
  exists (select 1 from collections c where c.id = collection_id and can_view(c.user_id, c.visibility)));
create policy collection_games_write on collection_games for all
  using (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()));

create policy connected_read on connected_accounts for select using (
  can_view(user_id, (select connected_accounts from privacy_settings p where p.user_id = connected_accounts.user_id)));
-- connected_account_secrets: intentionally no policies.

create policy sync_jobs_own on game_sync_jobs for select using (auth.uid() = user_id);

create policy media_read on media_files for select using (status = 'ready' and can_view(owner_id, visibility));
create policy media_update on media_files for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- media insert/delete happen server-side (quota checks, object deletion).

create policy quotas_own on storage_quotas for select using (auth.uid() = user_id);
create policy usage_own on storage_usage for select using (auth.uid() = user_id);
create policy subs_own on subscriptions for select using (auth.uid() = user_id);
create policy addons_own on storage_addons for select using (auth.uid() = user_id);

create policy activity_read on activity_events for select using (
  can_view(user_id, least(visibility, (select activity from privacy_settings p where p.user_id = activity_events.user_id))));
-- audit_logs: intentionally no policies.
