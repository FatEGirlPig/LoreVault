import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTime, gameRecords } from "@/lib/speedrun";
import { Empty } from "@/components/ui";

export default async function SpeedrunGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await gameRecords(id);
  if (!data) notFound();
  const { game, records } = data;
  const [top, ...rest] = records;

  return (
    <div className="space-y-6">
      <Link href="/speedruns" className="text-sm text-mute hover:text-ink">← All speedruns</Link>
      <div className="flex flex-col gap-5 sm:flex-row">
        {game.cover && <img src={game.cover} alt="" className="w-40 shrink-0 rounded-xl border border-line" />}
        <div className="space-y-2">
          <h1 className="h1">{game.name}</h1>
          {game.released && <p className="text-sm text-mute">Released {game.released}</p>}
          <a href={game.weblink} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-cyan hover:underline">Full leaderboards on speedrun.com ↗</a>
        </div>
      </div>
      {top ? (<>
        <div className="card bg-gradient-to-br from-violet/20 to-cyan/10 text-center">
          <p className="label">🏆 World record · {top.category}</p>
          <p className="glow-text font-display text-5xl font-black">{formatTime(top.time)}</p>
          <p className="mt-2 text-sm">by <b>{top.players.join(", ")}</b>{top.date && <span className="text-mute"> · {new Date(top.date).toLocaleDateString()}</span>}</p>
          <div className="mt-3 flex justify-center gap-3 text-sm">
            {top.video && <a href={top.video} target="_blank" rel="noopener noreferrer" className="btn-primary">▶ Watch run</a>}
            <a href={top.weblink} target="_blank" rel="noopener noreferrer" className="btn-ghost">Run details</a>
          </div>
        </div>
        {!!rest.length && <section>
          <h2 className="mb-3 font-display font-bold">Other categories</h2>
          <ul className="card divide-y divide-line p-0">{rest.map((r) => (
            <li key={r.category} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 font-semibold">{r.category}</span>
              <span className="font-display text-cyan">{formatTime(r.time)}</span>
              <span className="w-full truncate text-mute sm:w-48">{r.players.join(", ")}</span>
              {r.video ? <a href={r.video} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan hover:underline">▶ Watch</a>
                : <a href={r.weblink} target="_blank" rel="noopener noreferrer" className="text-xs text-mute hover:underline">Details</a>}
            </li>))}</ul>
        </section>}
      </>) : <Empty title="No world records yet">This game doesn&apos;t have any verified full-game runs on speedrun.com.</Empty>}
    </div>
  );
}
