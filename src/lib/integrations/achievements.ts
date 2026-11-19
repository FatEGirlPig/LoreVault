import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { fetchSteamAchievements, type Achievement } from "./steam";

const MAX_AGE_MS = 6 * 3600e3;

/** Return cached achievements for a Steam library entry, refreshing from Steam when stale. */
export async function getAchievements(userId: string, userGameId: string, opts: { force?: boolean } = {}):
  Promise<{ items: Achievement[]; unlocked: number; total: number; fetchedAt: string | null; error?: string }> {
  const db = adminClient();
  const { data: ug } = await db.from("user_games")
    .select("id, platform, connected_account_id, games(external_id, title), connected_accounts(external_user_id)")
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
    await recordActivity(userId, userGameId, (ug.games as unknown as { title: string }).title, (cached?.items ?? []) as Achievement[], items, !!cached);
    return { items, unlocked, total: items.length, fetchedAt: row.fetched_at };
  } catch (e) {
    return { ...fromCache(), error: e instanceof Error ? e.message : "Could not load achievements." };
  }
}

/** Fetch achievements for the user's most-played Steam games that have no (or stale) cache. Returns games refreshed. */
export async function prefetchAchievements(userId: string, opts: { limit?: number; maxAgeMs?: number } = {}) {
  const db = adminClient();
  const maxAge = opts.maxAgeMs ?? 24 * 3600e3;
  const { data: rows } = await db.from("user_games")
    .select("id, playtime_minutes, user_achievements(fetched_at)")
    .eq("user_id", userId).eq("platform", "steam").not("connected_account_id", "is", null)
    .gt("playtime_minutes", 0).order("playtime_minutes", { ascending: false }).limit(500);
  const todo = (rows ?? []).filter((r) => {
    const f = (r.user_achievements as unknown as { fetched_at: string } | null)?.fetched_at;
    return !f || Date.now() - new Date(f).getTime() > maxAge;
  }).slice(0, opts.limit ?? 100);
  let done = 0;
  for (let i = 0; i < todo.length; i += 5) {   // 5 at a time to stay well inside Steam's rate limits
    await Promise.all(todo.slice(i, i + 5).map((r) => getAchievements(userId, r.id, { force: true }).then(() => done++)));
  }
  return done;
}

const RECENT_MS = 14 * 864e5;

/** Turn newly unlocked achievements (and newly perfect games) into feed events. Old unlocks never flood the feed. */
async function recordActivity(userId: string, ugId: string, game: string, before: Achievement[], after: Achievement[], hadCache: boolean) {
  const was = new Set(before.filter((a) => a.unlocked).map((a) => a.id));
  const fresh = after.filter((a) => a.unlocked && !was.has(a.id) && a.unlockedAt && Date.now() - a.unlockedAt * 1000 < RECENT_MS);
  const events = fresh.slice(0, 15).map((a) => ({
    user_id: userId, kind: "achievement", visibility: "public", dedup_key: `ach:${ugId}:${a.id}`,
    created_at: new Date(a.unlockedAt! * 1000).toISOString(),
    payload: { game, ugId, name: a.name, icon: a.icon, percent: a.globalPercent },
  }));
  const perfectNow = after.length > 0 && after.every((a) => a.unlocked);
  const perfectBefore = hadCache && before.length > 0 && before.every((a) => a.unlocked);
  if (perfectNow && !perfectBefore && fresh.length) {
    const last = Math.max(...after.map((a) => a.unlockedAt ?? 0));
    events.push({ user_id: userId, kind: "perfect", visibility: "public", dedup_key: `perfect:${ugId}`,
      created_at: new Date(last * 1000).toISOString(), payload: { game, ugId, name: "", icon: "", percent: null } });
  }
  if (events.length) await adminClient().from("activity_events").upsert(events, { onConflict: "user_id,dedup_key", ignoreDuplicates: true });
}
