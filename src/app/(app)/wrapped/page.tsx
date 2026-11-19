import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { loadStats } from "@/lib/stats";
import { Empty } from "@/components/ui";
export const metadata = { title: "Year in Review" };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function Wrapped({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const now = new Date().getFullYear();
  const year = Math.min(now, Math.max(2004, Number(sp.year) || now));
  const { supabase, user } = await requireUser();
  const { rows, unlocks } = await loadStats(supabase, user.id);
  const inYear = unlocks.filter((a) => a.unlockedAt && new Date(a.unlockedAt * 1000).getFullYear() === year);
  const years = [...new Set(unlocks.filter((a) => a.unlockedAt).map((a) => new Date(a.unlockedAt! * 1000).getFullYear()))].sort((a, b) => b - a);

  const byGame = new Map<string, { game: string; ugId: string; n: number }>();
  inYear.forEach((a) => { const g = byGame.get(a.ugId) ?? { game: a.game, ugId: a.ugId, n: 0 }; g.n++; byGame.set(a.ugId, g); });
  const topGames = [...byGame.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  const months = Array(12).fill(0); inYear.forEach((a) => months[new Date(a.unlockedAt! * 1000).getMonth()]++);
  const busiest = months.indexOf(Math.max(...months));
  const rarest = inYear.filter((a) => a.globalPercent != null).sort((a, b) => a.globalPercent! - b.globalPercent!)[0];
  const perfected = rows.filter((r) => r.unlocked === r.total && new Date(Math.max(...r.items.map((a) => a.unlockedAt ?? 0)) * 1000).getFullYear() === year);
  const max = Math.max(1, ...months);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h1"><span className="glow-text">{year}</span> in review</h1>
        {years.length > 1 && <nav className="flex gap-2">{years.slice(0, 6).map((y) => (
          <Link key={y} href={`/wrapped?year=${y}`} className={`badge ${y === year ? "border-cyan text-cyan" : ""}`}>{y}</Link>))}</nav>}
      </div>
      {!inYear.length ? <Empty title={`No achievements unlocked in ${year} yet`}>Go play something! Your year fills in automatically as you unlock achievements on Steam.</Empty> : (<>
        <div className="card fade-in bg-gradient-to-br from-violet/20 to-cyan/10 py-10 text-center">
          <p className="text-mute">This year you unlocked</p>
          <p className="glow-text font-display text-6xl font-black">{inYear.length.toLocaleString()}</p>
          <p className="text-mute">achievements across {byGame.size} games</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card"><p className="label">Busiest month</p><p className="font-display text-2xl font-bold">{MONTHS[busiest]}</p><p className="text-xs text-mute">{months[busiest]} unlocks</p></div>
          <div className="card"><p className="label">Games perfected</p><p className="font-display text-2xl font-bold">{perfected.length}</p>
            <p className="truncate text-xs text-mute">{perfected.slice(0, 3).map((r) => r.user_games.games.title).join(", ") || "Next year!"}</p></div>
          <div className="card"><p className="label">Rarest unlock</p><p className="truncate font-display text-xl font-bold">{rarest?.name ?? "—"}</p>
            <p className="truncate text-xs text-mute">{rarest ? `${rarest.globalPercent}% of players · ${rarest.game}` : ""}</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card"><h2 className="mb-3 font-display font-bold">Top games</h2>
            <ol className="space-y-2">{topGames.map((g, i) => (
              <li key={g.ugId}><Link href={`/library/${g.ugId}`} className="flex justify-between gap-2 text-sm hover:text-cyan">
                <span className="truncate"><span className="mr-2 text-violet">#{i + 1}</span>{g.game}</span><span className="text-mute">{g.n} unlocks</span></Link></li>))}</ol>
          </section>
          <section className="card"><h2 className="mb-3 font-display font-bold">Month by month</h2>
            <div className="flex h-32 items-end gap-1" role="img" aria-label="Achievements unlocked per month">
              {months.map((m, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gradient-to-t from-violet to-cyan" style={{ height: `${(m / max) * 100}%`, minHeight: m ? 4 : 0 }} title={`${MONTHS[i]}: ${m}`} />
                <span className="text-[10px] text-mute">{MONTHS[i][0]}</span></div>)}
            </div>
          </section>
        </div>
      </>)}
    </div>
  );
}
