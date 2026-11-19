import Link from "next/link";
import { searchGames, trendingGames } from "@/lib/speedrun";
import { Empty } from "@/components/ui";
export const metadata = { title: "Speedruns" };

export default async function Speedruns({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const games = q ? await searchGames(q) : await trendingGames();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">World Record Speedruns</h1>
        <p className="mt-1 text-sm text-mute">Search any game to see its current world records. Data from speedrun.com.</p>
      </div>
      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search any game… (e.g. Super Mario 64, Celeste, Minecraft)" className="input" aria-label="Search games" />
        <button className="btn-primary">Search</button>
      </form>
      <h2 className="font-display font-bold">{q ? `Results for “${q}”` : "🔥 Most popular right now"}
        {!q && <span className="ml-2 text-sm font-normal text-mute">· ranked by runs verified recently</span>}</h2>
      {games.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {games.map((g, i) => (
            <li key={g.id}><Link href={`/speedruns/${g.id}`} className="card block h-full overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-violet">
              <div className="relative aspect-[3/4] bg-navy">
                {g.cover ? <img src={g.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                  : <div className="flex h-full items-center justify-center font-display text-3xl text-violet">{g.name[0]}</div>}
                {!q && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-display text-xs">#{i + 1}</span>}
              </div>
              <div className="p-3"><p className="line-clamp-2 text-sm font-semibold">{g.name}</p>
                <p className="text-xs text-mute">{"runs" in g ? `${g.runs} recent runs` : g.released ?? ""}</p></div>
            </Link></li>
          ))}
        </ul>
      ) : <Empty title={q ? "No games found" : "Couldn't reach speedrun.com"}>{q ? "Try a different spelling or a shorter name." : "Please try again in a moment."}</Empty>}
    </div>
  );
}
