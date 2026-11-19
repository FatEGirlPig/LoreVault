import { after } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { loadStats } from "@/lib/stats";
import { personality } from "@/lib/gamer";
import { refreshDeck, refreshPrices } from "@/lib/integrations/market";
import { getStoreInfo } from "@/lib/integrations/store";
import { Empty } from "@/components/ui";
export const metadata = { title: "Stats" };

type G = { playtime_minutes: number | null; game_id: string; games: { genres: string[] | null; price_cents: number | null; initial_price_cents: number | null; currency: string | null; deck_status: number | null; platform: string; store_fetched_at: string | null } };
const DECK = [["Verified", 3, "text-cyan"], ["Playable", 2, "text-amber-300"], ["Unsupported", 1, "text-red-300"], ["Unknown", 0, "text-mute"]] as const;

export default async function Stats() {
  const { supabase, user } = await requireUser();
  const [{ data }, s] = await Promise.all([
    supabase.from("user_games").select("playtime_minutes, game_id, games(genres, price_cents, initial_price_cents, currency, deck_status, platform, store_fetched_at)").eq("user_id", user.id).limit(5000),
    loadStats(supabase, user.id),
  ]);
  const games = (data ?? []) as unknown as G[];
  const steam = games.filter((g) => g.games.platform === "steam");

  // Fill in missing store data in the background so this page gets richer on the next visit.
  const ids = steam.map((g) => g.game_id);
  const needGenres = steam.filter((g) => !g.games.store_fetched_at).sort((a, b) => (b.playtime_minutes ?? 0) - (a.playtime_minutes ?? 0)).slice(0, 25);
  after(async () => {
    await refreshPrices(ids, 400).catch(() => {});
    await refreshDeck(ids, 40).catch(() => {});
    for (const g of needGenres) await getStoreInfo(g.game_id).catch(() => {});
  });

  const genreHours: Record<string, number> = {}, genreCount: Record<string, number> = {};
  for (const g of games) for (const gen of g.games.genres ?? []) { genreHours[gen] = (genreHours[gen] ?? 0) + (g.playtime_minutes ?? 0) / 60; genreCount[gen] = (genreCount[gen] ?? 0) + 1; }
  const topGenres = Object.entries(genreHours).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxG = Math.max(1, ...topGenres.map(([, h]) => h));
  const priced = steam.filter((g) => g.games.initial_price_cents != null);
  const value = priced.reduce((t, g) => t + (g.games.initial_price_cents ?? 0), 0), now = priced.reduce((t, g) => t + (g.games.price_cents ?? 0), 0);
  const cur = priced.find((g) => g.games.currency)?.games.currency ?? "USD";
  const deck = DECK.map(([label, v, cls]) => ({ label, cls, n: steam.filter((g) => (g.games.deck_status ?? 0) === v && (v !== 0 || g.games.deck_status != null)).length }));
  const started = s.rows.filter((r) => r.unlocked > 0);
  const completionRate = started.length ? started.reduce((t, r) => t + r.unlocked / r.total, 0) / started.length : 0;
  const buckets = [0, 0, 0, 0, 0]; started.forEach((r) => buckets[Math.min(4, Math.floor((r.unlocked / r.total) * 5))]++);
  const p = personality({ genres: genreCount, completionRate, perfect: s.stats.perfect, games: s.stats.games, rareShare: s.unlocks.length ? s.unlocks.filter((u) => (u.globalPercent ?? 100) < 10).length / s.unlocks.length : 0 });
  const played = games.filter((g) => (g.playtime_minutes ?? 0) > 0).length;

  if (!games.length) return <div className="space-y-6"><h1 className="h1">Stats</h1><Empty title="No games yet">Connect Steam to see your stats.</Empty></div>;
  return (
    <div className="space-y-6">
      <h1 className="h1">Stats</h1>
      <div className="card bg-gradient-to-br from-violet/20 to-cyan/10">
        <p className="label">Your gamer personality</p>
        <p className="glow-text font-display text-3xl font-black">{p.title}</p>
        <p className="mt-1 text-sm">{p.blurb}</p>
        {!!p.topGenres.length && <p className="mt-2 text-xs text-mute">Favourite genres: {p.topGenres.join(", ")}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Library value" value={priced.length ? `${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${cur}` : "…"} sub={priced.length ? `${(now / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} at today's prices · ${priced.length} games priced` : "Pricing your games, check back shortly"} />
        <Tile label="Hours played" value={Math.round(s.stats.minutes / 60).toLocaleString()} sub={`${(s.stats.minutes / 60 / Math.max(1, played)).toFixed(1)}h per played game`} />
        <Tile label="Games played" value={`${Math.round((played / games.length) * 100)}%`} sub={`${played} of ${games.length}`} />
        <Tile label="Avg. completion" value={`${Math.round(completionRate * 100)}%`} sub={`across ${started.length} games with achievements`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card"><h2 className="mb-3 font-display font-bold">Hours by genre</h2>
          {topGenres.length ? <ul className="space-y-2">{topGenres.map(([g, h]) => (
            <li key={g} className="text-sm"><div className="flex justify-between"><span>{g}</span><span className="text-mute">{Math.round(h)}h</span></div>
              <div className="mt-1 h-2 rounded-full bg-navy"><div className="h-2 rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${(h / maxG) * 100}%` }} /></div></li>))}</ul>
            : <p className="text-sm text-mute">Loading genre data from Steam. Refresh in a minute.</p>}
        </section>
        <section className="card"><h2 className="mb-3 font-display font-bold">Achievement completion</h2>
          <div className="flex h-36 items-end gap-2" role="img" aria-label="Games by completion range">
            {buckets.map((n, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-mute">{n}</span>
              <div className="w-full rounded-t bg-gradient-to-t from-violet to-cyan" style={{ height: `${(n / Math.max(1, ...buckets)) * 100}%`, minHeight: n ? 4 : 0 }} />
              <span className="text-[10px] text-mute">{i * 20}–{i === 4 ? 100 : i * 20 + 19}%</span></div>)}
          </div>
        </section>
      </div>
      <section className="card"><h2 className="mb-3 font-display font-bold">Steam Deck compatibility</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{deck.map((d) => (
          <div key={d.label}><p className={`font-display text-2xl font-bold ${d.cls}`}>{d.n}</p><p className="text-xs text-mute">{d.label}</p></div>))}</div>
        <p className="mt-2 text-xs text-mute">Checked from Steam in the background, about 40 games per visit.</p>
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="card"><p className="label">{label}</p><p className="glow-text font-display text-2xl font-bold">{value}</p><p className="text-xs text-mute">{sub}</p></div>;
}
