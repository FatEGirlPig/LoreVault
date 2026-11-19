-- Activity feed de-duplication
alter table activity_events add column if not exists dedup_key text;
create unique index if not exists activity_dedup on activity_events (user_id, dedup_key);

-- Steam store details cached on games
alter table games add column if not exists description text;
alter table games add column if not exists genres text[];
alter table games add column if not exists developer text;
alter table games add column if not exists release_date text;
alter table games add column if not exists background_url text;
alter table games add column if not exists screenshots jsonb;
alter table games add column if not exists store_fetched_at timestamptz;

-- Friend leaderboard: aggregates only, for you plus friends who share their library with you.
create or replace function friend_leaderboard()
returns table (user_id uuid, username text, display_name text, achievements bigint, perfect bigint, minutes bigint, games bigint)
language sql stable security definer set search_path = public as $$
  with people as (
    select auth.uid() as id
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from friendships f where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  )
  select p.id, pr.username, pr.display_name,
    coalesce((select sum(a.unlocked) from user_achievements a where a.user_id = p.id), 0),
    coalesce((select count(*) from user_achievements a where a.user_id = p.id and a.total > 0 and a.unlocked = a.total), 0),
    coalesce((select sum(g.playtime_minutes) from user_games g where g.user_id = p.id), 0),
    coalesce((select count(*) from user_games g where g.user_id = p.id), 0)
  from people p join profiles pr on pr.id = p.id
  join privacy_settings ps on ps.user_id = p.id
  where p.id = auth.uid() or ps.library <> 'private';
$$;
revoke execute on function friend_leaderboard() from anon;
grant execute on function friend_leaderboard() to authenticated;
