import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";
import { syncAccount } from "@/lib/integrations/sync";
import { prefetchAchievements } from "@/lib/integrations/achievements";
import { refreshPrices } from "@/lib/integrations/market";

export const maxDuration = 300;

/** Daily auto-sync (Vercel Cron). Refreshes the least recently synced Steam accounts. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  const { data: accounts } = await adminClient().from("connected_accounts").select("id, user_id")
    .eq("platform", "steam").neq("status", "revoked")
    .or(`last_synced_at.is.null,last_synced_at.lt.${new Date(Date.now() - 20 * 3600e3).toISOString()}`)
    .order("last_synced_at", { ascending: true, nullsFirst: true }).limit(40);
  let done = 0;
  for (const a of accounts ?? []) {
    if (Date.now() - started > 240_000) break; // stay inside the time limit
    try { await syncAccount(a.user_id, a.id); await prefetchAchievements(a.user_id, { limit: 60 }); done++; } catch {}
  }
  // Wishlist price drops: refresh prices for wishlisted games first.
  const { data: wish } = await adminClient().from("collection_games").select("game_id, collections!inner(is_wishlist)").eq("collections.is_wishlist", true).limit(1000);
  const prices = await refreshPrices([...new Set((wish ?? []).map((w) => w.game_id))]).catch(() => 0);
  return NextResponse.json({ prices, synced: done, pending: (accounts?.length ?? 0) - done });
}
