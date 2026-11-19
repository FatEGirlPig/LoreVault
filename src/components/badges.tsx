import type { Badge } from "@/lib/badges";

export function Badges({ badges, earnedOnly }: { badges: Badge[]; earnedOnly?: boolean }) {
  const list = earnedOnly ? badges.filter((b) => b.earned) : badges;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {list.map((b) => (
        <li key={b.id} title={b.desc} className={`rounded-xl border p-3 text-center transition ${b.earned ? "border-violet/60 bg-violet/10" : "border-line opacity-50 grayscale"}`}>
          <div className="text-3xl" aria-hidden>{b.icon}</div>
          <p className="mt-1 text-sm font-semibold">{b.name}</p>
          <p className="text-[11px] text-mute">{b.earned ? b.desc : b.progress ?? b.desc}</p>
        </li>))}
    </ul>
  );
}
