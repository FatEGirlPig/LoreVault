"use client";
import { useState } from "react";
import type { Achievement } from "@/lib/integrations/steam";

type Filter = "all" | "unlocked" | "locked";

export function Achievements({ items }: { items: Achievement[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showHidden, setShowHidden] = useState(false);
  const unlocked = items.filter((a) => a.unlocked).length;
  const pct = items.length ? Math.round((unlocked / items.length) * 100) : 0;
  const list = items
    .filter((a) => filter === "all" || (filter === "unlocked" ? a.unlocked : !a.unlocked))
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0) || (b.globalPercent ?? 0) - (a.globalPercent ?? 0));

  return (
    <div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-navy" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Achievements unlocked">
        <div className="h-full rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${pct}%` }} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {(["all", "unlocked", "locked"] as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`badge capitalize ${filter === f ? "border-cyan text-cyan" : "hover:text-ink"}`}>{f}</button>
        ))}
        <label className="ml-auto text-xs text-mute"><input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="mr-1" />Show hidden descriptions</label>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((a) => {
          const secret = a.hidden && !a.unlocked && !showHidden;
          return (
            <li key={a.id} className={`flex gap-3 rounded-xl border border-line p-3 ${a.unlocked ? "bg-navy" : "opacity-70"}`}>
              {(a.unlocked ? a.icon : a.iconGray)
                ? <img src={a.unlocked ? a.icon : a.iconGray} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg" loading="lazy" />
                : <div className="h-12 w-12 shrink-0 rounded-lg bg-panel" />}
              <div className="min-w-0">
                <p className="truncate font-semibold">{secret ? "Hidden achievement" : a.name}</p>
                <p className="line-clamp-2 text-xs text-mute">{secret ? "Keep playing to reveal it." : a.description}</p>
                <p className="mt-1 text-xs text-mute">
                  {a.unlocked ? <span className="text-cyan">Unlocked{a.unlockedAt ? ` ${new Date(a.unlockedAt * 1000).toLocaleDateString()}` : ""}</span> : "Locked"}
                  {a.globalPercent != null && <> · {a.globalPercent}% of players{a.globalPercent < 10 && <span className="text-violet"> · Rare</span>}</>}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
