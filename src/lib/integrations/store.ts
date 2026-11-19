import "server-only";
import { adminClient } from "@/lib/supabase/server";

const MAX_AGE_MS = 30 * 864e5;
export type StoreInfo = { description: string | null; genres: string[] | null; developer: string | null; release_date: string | null; background_url: string | null; screenshots: string[] | null };

/** Steam store details (public, no key), cached on the games row for 30 days. */
export async function getStoreInfo(gameId: string): Promise<StoreInfo | null> {
  const db = adminClient();
  const { data: g } = await db.from("games").select("platform, external_id, description, genres, developer, release_date, background_url, screenshots, store_fetched_at").eq("id", gameId).single();
  if (!g || g.platform !== "steam" || !g.external_id) return null;
  if (g.store_fetched_at && Date.now() - new Date(g.store_fetched_at).getTime() < MAX_AGE_MS) return g as StoreInfo;
  try {
    const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${g.external_id}&l=english`, { signal: AbortSignal.timeout(5000) });
    const d = (await r.json())?.[g.external_id]?.data;
    const info: StoreInfo = {
      description: d?.short_description ? stripHtml(d.short_description) : null,
      genres: d?.genres?.map((x: { description: string }) => x.description).slice(0, 5) ?? null,
      developer: d?.developers?.join(", ") ?? null,
      release_date: d?.release_date?.date ?? null,
      background_url: d?.background_raw ?? d?.background ?? null,
      screenshots: d?.screenshots?.slice(0, 6).map((s: { path_thumbnail: string }) => s.path_thumbnail) ?? null,
    };
    await db.from("games").update({ ...info, store_fetched_at: new Date().toISOString() }).eq("id", gameId);
    return info;
  } catch {
    return g as StoreInfo;
  }
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
