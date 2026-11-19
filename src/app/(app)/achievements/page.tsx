import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { refreshAllAchievements } from "@/app/actions";
import { Submit } from "@/components/forms";
import { Empty, Notice } from "@/components/ui";
import type { Achievement } from "@/lib/integrations/steam";
export const metadata = { title: "Achievements" };

type Row = { user_game_id: string; unlocked: number; total: number; items: Achievement[]; user_games: { games: { title: string; cover_url: string | null } } };

export default async function Achievements({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data }, { count: steam }] = await Promise.all([
    supabase.from("user_achievements").select("user_game_id, unlocked, total, items, user_games(games(title, cover_url))")
      .eq("user_id", user.id).gt("total", 0),
    supabase.from("connected_accounts").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("platform", "steam"),
  ]);
  const rows = (data ?? []) as unknown as Row[];

  const totalUnlocked = rows.reduce((t, r) => t + r.unlocked, 0);
  const totalAll = rows.reduce((t, r) => t + r.total, 0);
  const perfect = rows.filter((r) => r.unlocked === r.total);
  const started = rows.filter((r) => r.unlocked > 0);
  const avg = started.length ? Math.round(started.reduce((t, r) => t + r.unlocked / r.total, 0) / started.length * 100) : 0;
  const all = rows.flatMap((r) => r.items.filter((a) => a.unlocked).map((a) => ({ ...a, game: r.user_games.games.title, ugId: r.user_game_id })));
  const recent = [...all].sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)).slice(0, 12);
  const rarest = all.filter((a) => a.globalPercent != null).sort((a, b) => a.globalPercent! - b.globalPercent!).slice(0, 8);
  const games = [...started].sort((a, b) => b.unlocked / b.total - a.unlocked / a.total);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h1">Trophy Room</h1>
        {!!steam && <form action={refreshAllAchievements}><Submit className="btn-ghost">Refresh from Steam</Submit></form>}
      </div>
      <Notice params={sp} />
      {!rows.length ? (
        <Empty title={steam ? "Loading your achievements…" : "Connect Steam to see your achievements"}>
          {steam ? "We fetch achievements in the background after each sync. Press Refresh if nothing shows up after a minute."
            : <Link href="/connections" className="text-cyan">Connect Steam</Link>}
        </Empty>
      ) : (<>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Achievements" value={totalUnlocked.toLocaleString()} sub={`of ${totalAll.toLocaleString()}`} />
          <Stat label="Perfect games" value={perfect.length} sub="100% complete" />
          <Stat label="Avg. completion" value={`${avg}%`} sub={`across ${started.length} games`} />
          <Stat label="Rarest unlock" value={rarest[0] ? `${rarest[0].globalPercent}%` : "—"} sub={rarest[0]?.name ?? ""} />
        </div>

        {!!recent.length && <section>
          <h2 className="mb-3 font-display font-bold">Recent unlocks</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{recent.map((a) => <AchItem key={a.ugId + a.id} a={a} />)}</ul>
        </section>}

        {!!rarest.length && <section>
          <h2 className="mb-3 font-display font-bold">Rarest achievements <span className="text-sm font-normal text-mute">· fewest players have these</span></h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{rarest.map((a) => <AchItem key={a.ugId + a.id} a={a} rare />)}</ul>
        </section>}

        <section>
          <h2 className="mb-3 font-display font-bold">Game progress</h2>
          <ul className="card divide-y divide-line p-0">{games.map((r) => {
            const pct = Math.round((r.unlocked / r.total) * 100);
            return (
              <li key={r.user_game_id}><Link href={`/library/${r.user_game_id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-navy">
                {r.user_games.games.cover_url
                  ? <img src={r.user_games.games.cover_url} alt="" className="hidden h-10 w-[88px] shrink-0 rounded object-cover sm:block" loading="lazy" />
                  : <div className="hidden h-10 w-[88px] shrink-0 rounded bg-navy sm:block" />}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm"><span className="truncate font-semibold">{r.user_games.games.title}</span>
                    <span className={pct === 100 ? "text-cyan" : "text-mute"}>{pct === 100 ? "🏆 " : ""}{r.unlocked}/{r.total}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy"><div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${pct}%` }} /></div>
                </div>
              </Link></li>);
          })}</ul>
        </section>
      </>)}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return <div className="card"><p className="label">{label}</p><p className="glow-text font-display text-3xl font-bold">{value}</p><p className="truncate text-xs text-mute">{sub}</p></div>;
}

function AchItem({ a, rare }: { a: Achievement & { game: string; ugId: string }; rare?: boolean }) {
  return (
    <li><Link href={`/library/${a.ugId}`} className={`flex gap-3 rounded-xl border p-3 transition hover:border-violet ${rare ? "border-violet/50 bg-violet/5" : "border-line bg-panel/60"}`}>
      {a.icon ? <img src={a.icon} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg" loading="lazy" /> : <div className="h-11 w-11 shrink-0 rounded-lg bg-navy" />}
      <div className="min-w-0"><p className="truncate text-sm font-semibold">{a.name}</p><p className="truncate text-xs text-mute">{a.game}</p>
        <p className="text-xs text-mute">{a.globalPercent != null && <span className={a.globalPercent < 10 ? "text-violet" : ""}>{a.globalPercent}% of players</span>}
          {a.unlockedAt && !rare && <> · {new Date(a.unlockedAt * 1000).toLocaleDateString()}</>}</p></div>
    </Link></li>
  );
}
