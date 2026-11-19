import "server-only";
import { after } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { syncAccount } from "@/lib/integrations/sync";
import { prefetchAchievements } from "@/lib/integrations/achievements";

const STALE_MS = 12 * 3600e3;

/** When an active user's Steam data is over 12h old, refresh it in the background after the page is sent. */
export function autoSyncIfStale(userId: string, accounts: { id?: string; platform: string; last_synced_at: string | null; status: string }[] | null) {
  const steam = accounts?.find((a) => a.platform === "steam" && a.status !== "revoked");
  if (!steam?.id || (steam.last_synced_at && Date.now() - new Date(steam.last_synced_at).getTime() < STALE_MS)) return;
  const id = steam.id;
  after(async () => {
    // Mark first so concurrent page loads don't start duplicate syncs.
    await adminClient().from("connected_accounts").update({ last_synced_at: new Date().toISOString() }).eq("id", id);
    try { await syncAccount(userId, id); await prefetchAchievements(userId, { limit: 60 }); } catch {}
  });
}
