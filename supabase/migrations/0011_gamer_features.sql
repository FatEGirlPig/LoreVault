-- ===== Steam extras =====
alter table user_games add column if not exists playtime_2weeks integer;           -- from GetRecentlyPlayedGames
alter table games add column if not exists price_cents integer;                     -- current price (store)
alter table games add column if not exists initial_price_cents integer;
alter table games add column if not exists discount_percent integer;
alter table games add column if not exists currency text;
alter table games add column if not exists is_free boolean;
alter table games add column if not exists price_checked_at timestamptz;
alter table games add column if not exists deck_status smallint;                    -- 3 verified, 2 playable, 1 unsupported, 0 unknown
alter table games add column if not exists deck_checked_at timestamptz;

-- ===== Profile customization =====
alter table profiles add column if not exists accent text check (accent ~ '^#[0-9a-fA-F]{6}$');
alter table profiles add column if not exists banner_game_id uuid references games on delete set null;
alter table profiles add column if not exists showcase uuid[] not null default '{}';  -- user_games ids (max 6)
alter table profiles add column if not exists pinned jsonb not null default '[]';     -- [{ugId, id}] (max 3)

-- ===== Notifications =====
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on notifications (user_id, created_at desc);
alter table notifications enable row level security;
create policy notifications_own on notifications for select using (auth.uid() = user_id);
create policy notifications_mark on notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete on notifications for delete using (auth.uid() = user_id);

-- ===== Reactions & comments (on clips and activity events) =====
create or replace function can_view_target(t text, tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case t
    when 'clip' then exists (select 1 from clips c where c.id = tid and can_view(c.user_id, c.visibility))
    when 'activity' then exists (select 1 from activity_events e join privacy_settings p on p.user_id = e.user_id
                                 where e.id = tid and can_view(e.user_id, least(e.visibility, p.activity)))
    else false end;
$$;
create table if not exists reactions (
  target_type text not null check (target_type in ('clip', 'activity')),
  target_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  emoji text not null check (emoji in ('🔥', '👏', '😂', '😮', 'GG')),
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, user_id, emoji)
);
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('clip', 'activity')),
  target_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_target on comments (target_type, target_id, created_at);
alter table reactions enable row level security;
alter table comments enable row level security;
create policy reactions_read on reactions for select using (can_view_target(target_type, target_id));
create policy reactions_write on reactions for insert with check (auth.uid() = user_id and can_view_target(target_type, target_id));
create policy reactions_delete on reactions for delete using (auth.uid() = user_id);
create policy comments_read on comments for select using (can_view_target(target_type, target_id));
create policy comments_write on comments for insert with check (auth.uid() = user_id and can_view_target(target_type, target_id));
create policy comments_delete on comments for delete using (auth.uid() = user_id);

-- ===== Looking for group =====
create table if not exists lfg_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  game_title text not null check (char_length(game_title) between 1 and 120),
  game_id uuid references games on delete set null,
  slots smallint not null check (slots between 1 and 20),
  play_time text check (char_length(play_time) <= 60),
  note text check (char_length(note) <= 300),
  platform text,
  visibility visibility not null default 'public',
  expires_at timestamptz not null default now() + interval '2 days',
  created_at timestamptz not null default now()
);
create table if not exists lfg_joins (
  post_id uuid not null references lfg_posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table lfg_posts enable row level security;
alter table lfg_joins enable row level security;
create policy lfg_read on lfg_posts for select using (can_view(user_id, visibility));
create policy lfg_write on lfg_posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy lfg_joins_read on lfg_joins for select using (exists (select 1 from lfg_posts p where p.id = post_id and can_view(p.user_id, p.visibility)));
create policy lfg_joins_write on lfg_joins for insert with check (auth.uid() = user_id and exists (select 1 from lfg_posts p where p.id = post_id and can_view(p.user_id, p.visibility) and p.expires_at > now()));
create policy lfg_joins_delete on lfg_joins for delete using (auth.uid() = user_id or exists (select 1 from lfg_posts p where p.id = post_id and p.user_id = auth.uid()));

-- ===== Groups / clans =====
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,32}$'),
  name text not null check (char_length(name) between 2 and 50),
  description text check (char_length(description) <= 500),
  owner_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists group_members (
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table groups enable row level security;
alter table group_members enable row level security;
create policy groups_read on groups for select using (true);
create policy groups_create on groups for insert with check (auth.uid() = owner_id);
create policy groups_owner on groups for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy groups_delete on groups for delete using (auth.uid() = owner_id);
create policy members_read on group_members for select using (true);
create policy members_join on group_members for insert with check (auth.uid() = user_id and role = 'member');
create policy members_leave on group_members for delete using (auth.uid() = user_id or exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid()));

-- ===== Leaderboards for a game and a group (aggregates, privacy-respecting) =====
create or replace function game_leaderboard(gid uuid)
returns table (user_id uuid, username text, unlocked int, total int, minutes int)
language sql stable security definer set search_path = public as $$
  select ug.user_id, pr.username, coalesce(a.unlocked, 0), coalesce(a.total, 0), coalesce(ug.playtime_minutes, 0)
  from user_games ug join profiles pr on pr.id = ug.user_id join privacy_settings ps on ps.user_id = ug.user_id
  left join user_achievements a on a.user_game_id = ug.id
  where ug.game_id = gid and pr.username is not null and can_view(ug.user_id, ps.library)
  order by coalesce(a.unlocked::float / nullif(a.total, 0), 0) desc, ug.playtime_minutes desc nulls last limit 50;
$$;
create or replace function group_leaderboard(gid uuid)
returns table (user_id uuid, username text, achievements bigint, perfect bigint, minutes bigint)
language sql stable security definer set search_path = public as $$
  select m.user_id, pr.username,
    coalesce((select sum(a.unlocked) from user_achievements a where a.user_id = m.user_id), 0),
    coalesce((select count(*) from user_achievements a where a.user_id = m.user_id and a.total > 0 and a.unlocked = a.total), 0),
    coalesce((select sum(g.playtime_minutes) from user_games g where g.user_id = m.user_id), 0)
  from group_members m join profiles pr on pr.id = m.user_id join privacy_settings ps on ps.user_id = m.user_id
  where m.group_id = gid and can_view(m.user_id, ps.library);
$$;
grant execute on function game_leaderboard(uuid), group_leaderboard(uuid), can_view_target(text, uuid) to anon, authenticated;

-- Grants for new tables
grant select, insert, update, delete on notifications, reactions, comments, lfg_posts, lfg_joins, groups, group_members to authenticated, service_role;
grant select on reactions, comments, lfg_posts, lfg_joins, groups, group_members to anon;
