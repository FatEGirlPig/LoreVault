import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { fetchDeckStatus, fetchPrices } from "./steam";
import { notify } from "@/lib/notify";

const DAY = 864e5;

/** Refresh store prices for Steam games (stale > 24h) and notify wishlisters when a price drops. */
export async function refreshPrices(gameIds?: string[], limit = 300) {
  const db = adminClient();
  let q = db.from("games").select("id, title, external_id, price_cents, price_checked_at").eq("platform", "steam").not("external_id", "is", null)
    .or(`price_checked_at.is.null,price_checked_at.lt.${new Date(Date.now() - DAY).toISOString()}`).limit(limit);
  if (gameIds?.length) q = q.in("id", gameIds);
  const { data: games } = await q;
  if (!games?.length) return 0;
  const prices = await fetchPrices(games.map((g) => g.external_id!));
  const now = new Date().toISOString();
  for (const g of games) {
    const p = prices.get(g.external_id!);
    await db.from("games").update(p ? { price_cents: p.cents, initial_price_cents: p.initial, discount_percent: p.discount, currency: p.currency, is_free: p.free, price_checked_at: now } : { price_checked_at: now }).eq("id", g.id);
    if (p && g.price_cents != null && p.cents != null && p.cents < g.price_cents) {
      const { data: watchers } = await db.from("collection_games").select("collections!inner(user_id, is_wishlist)").eq("game_id", g.id).eq("collections.is_wishlist", true);
      for (const w of watchers ?? []) {
        const uid = (w.collections as unknown as { user_id: string }).user_id;
        await notify(uid, "price_drop", { game: g.title, gameId: g.id, from: g.price_cents, to: p.cents, discount: p.discount, currency: p.currency });
      }
    }
  }
  return games.length;
}

/** Steam Deck status for up to `limit` games not checked in 14 days. */
export async function refreshDeck(gameIds: string[], limit = 40) {
  const db = adminClient();
  const { data: games } = await db.from("games").select("id, external_id").in("id", gameIds).eq("platform", "steam")
    .or(`deck_checked_at.is.null,deck_checked_at.lt.${new Date(Date.now() - 14 * DAY).toISOString()}`).limit(limit);
  for (let i = 0; i < (games?.length ?? 0); i += 5) {
    await Promise.all(games!.slice(i, i + 5).map(async (g) =>
      db.from("games").update({ deck_status: await fetchDeckStatus(g.external_id!), deck_checked_at: new Date().toISOString() }).eq("id", g.id)));
  }
}
