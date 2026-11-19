import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { getConnector } from "./index";

const MAX_ATTEMPTS = 3;

/** Idempotent library sync: upserts games and user_games on unique keys, records a job. */
export async function syncAccount(userId: string, accountId: string) {
  const db = adminClient();
  const { data: account } = await db.from("connected_accounts").select("*").eq("id", accountId).eq("user_id", userId).single();
  if (!account) throw new Error("Account not found.");
  const connector = getConnector(account.platform);
  if (!connector?.fetchLibrary) throw new Error("This platform does not support sync yet.");

  const { data: job } = await db.from("game_sync_jobs")
    .insert({ user_id: userId, account_id: accountId, status: "running", started_at: new Date().toISOString() })
    .select().single();

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { games, dataTypes } = await connector.fetchLibrary(account.external_user_id);
      const now = new Date().toISOString();
      for (let i = 0; i < games.length; i += 500) {
        const chunk = games.slice(i, i + 500);
        const { data: rows, error } = await db.from("games").upsert(
          chunk.map((g) => ({ title: g.title, platform: account.platform, external_id: g.externalId, cover_url: g.coverUrl, source: "sync" })),
          { onConflict: "platform,external_id" }).select("id, external_id");
        if (error) throw error;
        const idByExt = new Map(rows!.map((r) => [r.external_id, r.id]));
        const { error: e2 } = await db.from("user_games").upsert(chunk.map((g) => ({
          user_id: userId, game_id: idByExt.get(g.externalId), platform: account.platform, source: "sync",
          connected_account_id: accountId, playtime_minutes: g.playtimeMinutes ?? null, last_synced_at: now,
        })), { onConflict: "user_id,game_id,platform" });
        if (e2) throw e2;
      }
      await db.from("connected_accounts").update({
        status: "connected", last_synced_at: now, last_error: null,
        available_data: ["identity", ...dataTypes],
      }).eq("id", accountId);
      await db.from("game_sync_jobs").update({ status: "succeeded", attempt, games_imported: games.length, finished_at: now }).eq("id", job!.id);
      return { imported: games.length };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Sync failed.";
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  await db.from("connected_accounts").update({ status: "error", last_error: lastError }).eq("id", accountId);
  await db.from("game_sync_jobs").update({ status: "failed", attempt: MAX_ATTEMPTS, error: lastError, finished_at: new Date().toISOString() }).eq("id", job!.id);
  throw new Error(lastError);
}
