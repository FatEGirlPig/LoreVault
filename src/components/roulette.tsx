"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type Game = { id: string; title: string; cover: string | null; genres: string[]; minutes: number };

export function Roulette({ games }: { games: Game[] }) {
  const genres = useMemo(() => [...new Set(games.flatMap((g) => g.genres))].sort(), [games]);
  const [genre, setGenre] = useState("");
  const [fresh, setFresh] = useState(false);
  const [pick, setPick] = useState<Game | null>(null);
  const [spinning, setSpinning] = useState(false);
  const pool = games.filter((g) => (!genre || g.genres.includes(genre)) && (!fresh || g.minutes === 0));

  function spin() {
    if (!pool.length) return;
    setSpinning(true);
    let n = 0;
    const tick = () => {
      setPick(pool[Math.floor(Math.random() * pool.length)]);
      if (++n < 12) setTimeout(tick, 40 + n * 12); else setSpinning(false);
    };
    tick();
  }

  if (!games.length) return <div className="card text-sm text-mute">No backlog! Every game is played or completed. 🎉</div>;
  return (
    <div className="card grid gap-4 sm:grid-cols-[1fr_2fr]">
      <div className="space-y-3">
        <p className="text-sm text-mute">Can&apos;t decide? Let fate pick from your {pool.length} unplayed or barely played games.</p>
        {genres.length > 0 && <select value={genre} onChange={(e) => setGenre(e.target.value)} className="input" aria-label="Genre">
          <option value="">Any genre</option>{genres.map((g) => <option key={g}>{g}</option>)}</select>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} />Never launched only</label>
        <button type="button" onClick={spin} disabled={spinning || !pool.length} className="btn-primary w-full">{spinning ? "Spinning…" : pick ? "Spin again" : "🎲 Spin"}</button>
      </div>
      <div className={`flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-line bg-navy ${spinning ? "" : "fade-in"}`}>
        {pick ? (
          <Link href={`/library/${pick.id}`} className="w-full text-center">
            {pick.cover && <img src={pick.cover} alt="" className={`w-full object-cover ${spinning ? "opacity-60 blur-[1px]" : ""}`} />}
            <p className="p-3 font-display font-bold">{pick.title}{!spinning && <span className="ml-2 text-sm text-cyan">Play this →</span>}</p>
          </Link>
        ) : <p className="font-display text-mute">?</p>}
      </div>
    </div>
  );
}
