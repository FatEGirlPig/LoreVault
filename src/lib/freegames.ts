/** Current free-to-keep PC game giveaways from GamerPower's public API (no key). Cached for an hour. */
export type Giveaway = { id: number; title: string; worth: string; image: string; url: string; platforms: string; endDate: string | null; type: string };

export async function freeGames(): Promise<Giveaway[]> {
  try {
    const r = await fetch("https://www.gamerpower.com/api/giveaways?platform=pc&type=game&sort-by=popularity", { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const list = (await r.json()) as { id: number; title: string; worth: string; image: string; open_giveaway_url: string; platforms: string; end_date: string; type: string }[];
    return list.slice(0, 12).map((g) => ({ id: g.id, title: g.title, worth: g.worth, image: g.image, url: g.open_giveaway_url, platforms: g.platforms, type: g.type,
      endDate: g.end_date && g.end_date !== "N/A" ? g.end_date : null }));
  } catch { return []; }
}
