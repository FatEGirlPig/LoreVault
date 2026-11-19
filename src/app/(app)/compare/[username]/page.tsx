import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { gamerProgress, loadStats } from "@/lib/stats";
import { Empty } from "@/components/ui";

type G = { id: string; game_id: string; playtime_minutes: number | null; games: { title: string; cover_url: string | null }; user_achievements: { unlocked: number; total: number } | null };

export default async function Compare({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, user } = await requireUser();
  const { data: them } = await supabase.from("profiles").select("id, username, display_name").eq("username", username.toLowerCase()).single();
  if (!them) notFound();
  const { data: me } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  const sel = "id, game_id, playtime_minutes, games(title, cover_url), user_achievements(unlocked, total)";
  const [mine, theirs, myStats, theirStats] = await Promise.all([
    supabase.from("user_games").select(sel).eq("user_id", user.id).limit(3000),
    supabase.from("user_games").select(sel).eq("user_id", them.id).limit(3000), // RLS: empty if their library is private
    loadStats(supabase, user.id), loadStats(supabase, them.id),
  ]);
  const a = (mine.data ?? []) as unknown as G[], b = (theirs.data ?? []) as unknown as G[];
  const bByGame = new Map(b.map((g) => [g.game_id, g]));
  const shared = a.filter((g) => bByGame.has(g.game_id)).map((g) => ({ me: g, them: bByGame.get(g.game_id)! }))
    .sort((x, y) => (y.me.playtime_minutes ?? 0) + (y.them.playtime_minutes ?? 0) - (x.me.playtime_minutes ?? 0) - (x.them.playtime_minutes ?? 0));
  const pct = (g: G) => g.user_achievements?.total ? Math.round((g.user_achievements.unlocked / g.user_achievements.total) * 100) : null;
  const wins = shared.reduce((t, s) => { const x = pct(s.me) ?? -1, y = pct(s.them) ?? -1; return { me: t.me + (x > y ? 1 : 0), them: t.them + (y > x ? 1 : 0) }; }, { me: 0, them: 0 });
  const myLvl = gamerProgress(myStats).level.level, theirLvl = gamerProgress(theirStats).level.level;
  const rows: [string, number, number, (n: number) => string][] = [
    ["Level", myLvl, theirLvl, String], ["Games", myStats.stats.games, theirStats.stats.games, (n) => n.toLocaleString()],
    ["Hours", myStats.stats.minutes, theirStats.stats.minutes, (n) => Math.round(n / 60).toLocaleString()],
    ["Achievements", myStats.stats.achievements, theirStats.stats.achievements, (n) => n.toLocaleString()],
    ["Perfect games", myStats.stats.perfect, theirStats.stats.perfect, String],
    ["Shared-game wins", wins.me, wins.them, String],
  ];

  return (
    <div className="space-y-6">
      <h1 className="h1">You <span className="text-mute">vs</span> <span className="glow-text">{them.display_name || them.username}</span></h1>
      <div className="card p-0">
        <div className="grid grid-cols-3 border-b border-line px-5 py-3 text-xs text-mute"><span>@{me?.username ?? "you"}</span><span className="text-center">Stat</span><span className="text-right">@{them.username}</span></div>
        {rows.map(([label, x, y, f]) => (
          <div key={label} className="grid grid-cols-3 items-center px-5 py-3">
            <span className={`font-display text-xl font-bold ${x > y ? "text-cyan" : ""}`}>{f(x)}{x > y && " ✓"}</span>
            <span className="text-center text-sm text-mute">{label}</span>
            <span className={`text-right font-display text-xl font-bold ${y > x ? "text-cyan" : ""}`}>{y > x && "✓ "}{f(y)}</span>
          </div>))}
      </div>
      <section><h2 className="mb-3 font-display font-bold">Games you both own <span className="text-sm font-normal text-mute">· {shared.length}</span></h2>
        {shared.length ? <ul className="card divide-y divide-line p-0">{shared.slice(0, 60).map(({ me: m, them: t }) => {
          const x = pct(m), y = pct(t);
          return <li key={m.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2 text-sm">
            <span className={`text-right ${x != null && (y == null || x > y) ? "text-cyan" : "text-mute"}`}>{x != null ? `${x}%` : "—"} · {Math.round((m.playtime_minutes ?? 0) / 60)}h</span>
            <Link href={`/library/${m.id}`} className="max-w-[16rem] truncate text-center font-semibold hover:text-cyan">{m.games.title}</Link>
            <span className={y != null && (x == null || y > x) ? "text-cyan" : "text-mute"}>{Math.round((t.playtime_minutes ?? 0) / 60)}h · {y != null ? `${y}%` : "—"}</span>
          </li>;
        })}</ul> : <Empty title="No shared games found">Either you don&apos;t own the same games, or their library is private.</Empty>}
      </section>
    </div>
  );
}
