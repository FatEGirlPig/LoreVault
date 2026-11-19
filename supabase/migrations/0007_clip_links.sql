-- Clips are links to videos hosted elsewhere (YouTube, Twitch, Streamable): no file storage needed.
create table clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null check (provider in ('youtube', 'twitch', 'streamable')),
  video_id text not null check (char_length(video_id) between 1 and 200),
  url text not null check (char_length(url) <= 500),
  title text check (char_length(title) <= 100),
  game_id uuid references games on delete set null,
  visibility visibility not null default 'friends',
  created_at timestamptz not null default now()
);
create index clips_user on clips (user_id, created_at desc);
create index clips_public on clips (created_at desc) where visibility = 'public';
alter table clips enable row level security;
create policy clips_read on clips for select using (can_view(user_id, visibility));
create policy clips_write on clips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select on clips to anon;
grant select, insert, update, delete on clips to authenticated, service_role;
