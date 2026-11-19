/** speedrun.com public API v1 (no key). Responses are cached by Next for an hour to respect their rate limits. */
const API = "https://www.speedrun.com/api/v1";

type Asset = { uri: string } | null;
export type SrGame = { id: string; name: string; abbreviation: string; cover: string | null; released: number | null; weblink: string };
export type SrRecord = { category: string; time: number; date: string | null; players: string[]; video: string | null; weblink: string };
export type Trending = SrGame & { runs: number };

async function get<T>(path: string, revalidate = 3600): Promise<T | null> {
  try {
    const r = await fetch(`${API}${path}`, { next: { revalidate }, headers: { "User-Agent": "Vaultheim/1.0" }, signal: AbortSignal.timeout(8000) });
    return r.ok ? ((await r.json()) as { data: T }).data : null;
  } catch { return null; }
}

type RawGame = { id: string; names: { international: string }; abbreviation: string; released?: number; weblink: string; assets?: Record<string, Asset> };
export const mapGame = (g: RawGame): SrGame => ({
  id: g.id, name: g.names.international, abbreviation: g.abbreviation, released: g.released ?? null, weblink: g.weblink,
  cover: g.assets?.["cover-large"]?.uri ?? g.assets?.["cover-medium"]?.uri ?? null,
});

export async function searchGames(q: string): Promise<SrGame[]> {
  const data = await get<RawGame[]>(`/games?name=${encodeURIComponent(q.slice(0, 80))}&max=24`);
  return (data ?? []).map(mapGame);
}

/** Popularity proxy: games with the most runs verified recently across speedrun.com. */
export function rankTrending(runs: { game: { data: RawGame } }[]): Trending[] {
  const counts = new Map<string, Trending>();
  for (const r of runs) {
    const g = r.game?.data; if (!g?.id) continue;
    const t = counts.get(g.id) ?? { ...mapGame(g), runs: 0 };
    t.runs++; counts.set(g.id, t);
  }
  return [...counts.values()].sort((a, b) => b.runs - a.runs);
}

export async function trendingGames(): Promise<Trending[]> {
  const pages = await Promise.all([0, 200].map((offset) =>
    get<{ game: { data: RawGame } }[]>(`/runs?status=verified&orderby=verify-date&direction=desc&max=200&offset=${offset}&embed=game`, 1800)));
  return rankTrending(pages.flatMap((p) => p ?? [])).slice(0, 30);
}

type RawRun = { times: { primary_t: number }; date: string | null; weblink: string; videos?: { links?: { uri: string }[] } | null; players: { rel: string; id?: string; name?: string }[] };
type RawPlayer = { rel: string; names?: { international: string }; name?: string };

export async function gameRecords(id: string): Promise<{ game: SrGame; records: SrRecord[] } | null> {
  const g = await get<RawGame & { categories: { data: { id: string; name: string; type: string; miscellaneous: boolean }[] } }>(`/games/${encodeURIComponent(id)}?embed=categories`);
  if (!g) return null;
  const cats = g.categories.data.filter((c) => c.type === "per-game").sort((a, b) => Number(a.miscellaneous) - Number(b.miscellaneous)).slice(0, 10);
  const boards = await Promise.all(cats.map((c) =>
    get<{ runs: { place: number; run: RawRun }[]; players: { data: RawPlayer[] } }>(`/leaderboards/${g.id}/category/${c.id}?top=1&embed=players`)
      .then((b) => ({ c, b }))));
  const records = boards.flatMap(({ c, b }) => {
    const wr = b?.runs.find((r) => r.place === 1)?.run;
    if (!wr) return [];
    const names = (b!.players.data ?? []).map((p) => p.names?.international ?? p.name ?? "Guest");
    return [{ category: c.name, time: wr.times.primary_t, date: wr.date, players: names, video: wr.videos?.links?.[0]?.uri ?? null, weblink: wr.weblink }];
  });
  return { game: mapGame(g), records };
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  const ss = (s < 10 ? "0" : "") + (Number.isInteger(s) ? String(s) : s.toFixed(3));
  return h ? `${h}h ${String(m).padStart(2, "0")}m ${ss}s` : m ? `${m}m ${ss}s` : `${ss}s`;
}
