import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { fetchSteamAchievements, type Achievement } from "./steam";

const MAX_AGE_MS = 6 * 3600e3;

/** Return cached achievements for a Steam library entry, refreshing from Steam when stale. */
export async function getAchievements(userId: string, userGameId: string, opts: { force?: boolean } = {}):
  Promise<{ items: Achievement[]; unlocked: number; total: number; fetchedAt: string | null; error?: string }> {
  const db = adminClient();
  const { data: ug } = await db.from("user_games")
    .select("id, platform, connected_account_id, games(external_id), connected_accounts(external_user_id)")
    .eq("id", userGameId).eq("user_id", userId).single();
  const appId = (ug?.games as unknown as { external_id: string | null } | null)?.external_id;
  const steamId = (ug?.connected_accounts as unknown as { external_user_id: string } | null)?.external_user_id;
  const { data: cached } = await db.from("user_achievements").select("*").eq("user_game_id", userGameId).maybeSingle();
  const fromCache = () => ({ items: (cached?.items ?? []) as Achievement[], unlocked: cached?.unlocked ?? 0, total: cached?.total ?? 0, fetchedAt: cached?.fetched_at ?? null });
  if (!ug || ug.platform !== "steam" || !appId || !steamId) return fromCache();
  if (cached && !opts.force && Date.now() - new Date(cached.fetched_at).getTime() < MAX_AGE_MS) return fromCache();
  try {
    const items = await fetchSteamAchievements(steamId, appId);
    const unlocked = items.filter((a) => a.unlocked).length;
    const row = { user_game_id: userGameId, user_id: userId, items, unlocked, total: items.length, fetched_at: new Date().toISOString() };
    await db.from("user_achievements").upsert(row);
    return { items, unlocked, total: items.length, fetchedAt: row.fetched_at };
  } catch (e) {
    return { ...fromCache(), error: e instanceof Error ? e.message : "Could not load achievements." };
  }
}
