-- Cached Steam achievements per library entry. Written by the server; readable under the library's privacy setting.
create table user_achievements (
  user_game_id uuid primary key references user_games on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  unlocked integer not null default 0,
  total integer not null default 0,
  items jsonb not null default '[]',
  fetched_at timestamptz not null default now()
);
create index user_achievements_user on user_achievements (user_id);
alter table user_achievements enable row level security;
create policy user_achievements_read on user_achievements for select using (
  can_view(user_id, (select library from privacy_settings p where p.user_id = user_achievements.user_id)));
grant select on user_achievements to anon, authenticated;
grant all on user_achievements to service_role;
