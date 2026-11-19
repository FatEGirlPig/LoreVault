import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { Empty } from "@/components/ui";
export const metadata = { title: "Leaderboard" };

type Row = { user_id: string; username: string | null; display_name: string | null; achievements: number; perfect: number; minutes: number; games: number };
const BOARDS = [["achievements", "Achievements"], ["perfect", "Perfect games"], ["minutes", "Hours played"], ["games", "Games owned"]] as const;

export default async function Leaderboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const key = (BOARDS.find(([k]) => k === sp.by)?.[0] ?? "achievements") as (typeof BOARDS)[number][0];
  const { supabase, user } = await requireUser();
  const { data } = await supabase.rpc("friend_leaderboard");
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, achievements: Number(r.achievements), perfect: Number(r.perfect), minutes: Number(r.minutes), games: Number(r.games) }))
    .sort((a, b) => b[key] - a[key]);
  const fmt = (r: Row) => key === "minutes" ? `${Math.round(r.minutes / 60).toLocaleString()}h` : r[key].toLocaleString();
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <h1 className="h1">Leaderboard</h1>
      <nav className="flex flex-wrap gap-2" aria-label="Rank by">
        {BOARDS.map(([k, label]) => (
          <Link key={k} href={`/leaderboard?by=${k}`} aria-current={key === k ? "page" : undefined}
            className={`badge px-3 py-1 text-sm ${key === k ? "border-cyan text-cyan" : "hover:text-ink"}`}>{label}</Link>))}
      </nav>
      {rows.length > 1 ? (
        <ol className="card divide-y divide-line p-0">
          {rows.map((r, i) => (
            <li key={r.user_id} className={`flex items-center gap-4 px-5 py-3 ${r.user_id === user.id ? "bg-violet/10" : ""}`}>
              <span className="w-8 text-center font-display text-lg">{medal[i] ?? i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.username ? <Link href={`/profile/${r.username}`} className="font-semibold hover:text-cyan">{r.display_name || r.username}</Link> : "You"}
                {r.user_id === user.id && <span className="ml-2 text-xs text-mute">(you)</span>}
              </span>
              <span className="glow-text font-display text-xl font-bold">{fmt(r)}</span>
            </li>))}
        </ol>
      ) : <Empty title="It's lonely at the top"><Link href="/friends" className="text-cyan">Add friends</Link> to compete. Friends appear here when they share their library with friends (Settings → Privacy).</Empty>}
    </div>
  );
}
