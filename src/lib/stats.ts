import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement } from "@/lib/integrations/steam";
import { computeBadges, type Stats } from "@/lib/badges";

export type AchRow = { user_game_id: string; unlocked: number; total: number; items: Achievement[]; user_games: { games: { title: string; cover_url: string | null } } };
export type Unlock = Achievement & { game: string; ugId: string };

/** Everything the Trophy Room, Wrapped, badges and profile card need, in 4 queries. */
export async function loadStats(db: SupabaseClient, userId: string) {
  const [{ data: ach }, { data: games }, { count: friends }, { count: clips }] = await Promise.all([
    db.from("user_achievements").select("user_game_id, unlocked, total, items, user_games(games(title, cover_url))").eq("user_id", userId).gt("total", 0),
    db.from("user_games").select("playtime_minutes").eq("user_id", userId),
    db.from("friendships").select("*", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    db.from("clips").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const rows = (ach ?? []) as unknown as AchRow[];
  const unlocks: Unlock[] = rows.flatMap((r) => r.items.filter((a) => a.unlocked).map((a) => ({ ...a, game: r.user_games.games.title, ugId: r.user_game_id })));
  const rarest = unlocks.filter((a) => a.globalPercent != null).sort((a, b) => a.globalPercent! - b.globalPercent!);
  const stats: Stats = {
    achievements: unlocks.length,
    perfect: rows.filter((r) => r.unlocked === r.total).length,
    games: games?.length ?? 0,
    minutes: (games ?? []).reduce((t, g) => t + (g.playtime_minutes ?? 0), 0),
    rarest: rarest[0]?.globalPercent ?? null,
    friends: friends ?? 0,
    clips: clips ?? 0,
  };
  return { rows, unlocks, rarest, stats, badges: computeBadges(stats) };
}
