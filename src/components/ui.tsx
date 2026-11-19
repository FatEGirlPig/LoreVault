import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-display text-lg font-bold tracking-widest ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><defs><linearGradient id="lg" x1="0" x2="1"><stop stopColor="#10d070" /><stop offset="1" stopColor="#9dff5c" /></linearGradient></defs>
        <path d="M16 2 29 9v14L16 30 3 23V9z" fill="none" stroke="url(#lg)" strokeWidth="2.5" /><path d="M10 10l6 12 6-12" fill="none" stroke="url(#lg)" strokeWidth="2.5" strokeLinejoin="round" /></svg>
      <span>VAULT<span className="glow-text">HEIM</span></span>
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="card text-center"><p className="font-semibold">{title}</p><div className="mt-2 text-sm text-mute">{children}</div></div>;
}

export function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = params.error, msg = params.message;
  if (error) return <p role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{String(error)}</p>;
  if (msg) return <p role="status" className="mb-4 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm text-cyan">{String(msg)}</p>;
  return null;
}

const VIS = [["private", "Only me"], ["friends", "Friends"], ["public", "Public"]] as const;
export function VisibilitySelect({ name, value, label }: { name: string; value: string; label?: string }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <select name={name} defaultValue={value} className="input">
        {VIS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export const PLATFORM_LABEL: Record<string, string> = {
  steam: "Steam", playstation: "PlayStation", xbox: "Xbox", gog: "GOG", epic: "Epic Games", nintendo: "Nintendo", other: "Other",
};
export const SOURCE_LABEL: Record<string, string> = { manual: "Added manually", import: "Imported", sync: "Synced" };
