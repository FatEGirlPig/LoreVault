-- Global leaderboard: aggregates for players who made BOTH their profile and library public (opt-in).
create or replace function global_leaderboard()
returns table (user_id uuid, username text, display_name text, achievements bigint, perfect bigint, minutes bigint, games bigint)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.username, pr.display_name,
    coalesce((select sum(a.unlocked) from user_achievements a where a.user_id = pr.id), 0),
    coalesce((select count(*) from user_achievements a where a.user_id = pr.id and a.total > 0 and a.unlocked = a.total), 0),
    coalesce((select sum(g.playtime_minutes) from user_games g where g.user_id = pr.id), 0),
    coalesce((select count(*) from user_games g where g.user_id = pr.id), 0)
  from profiles pr join privacy_settings ps on ps.user_id = pr.id
  where pr.visibility = 'public' and ps.library = 'public' and pr.username is not null
    and (auth.uid() is null or not is_blocked(auth.uid(), pr.id));
$$;
grant execute on function global_leaderboard() to anon, authenticated;
