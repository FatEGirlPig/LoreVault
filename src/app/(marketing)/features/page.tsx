import Link from "next/link";
import { CONNECTORS } from "@/lib/integrations";
export const metadata = { title: "Features" };

const SECTIONS = [
  ["Library", ["Unified catalog with source badges (synced, imported, manual)", "Search, sort and filter by platform and status", "Notes, ratings, status and playtime tracking", "Manual additions and CSV import for anything we can't sync"]],
  ["Vault", ["10 GB free private storage", "Screenshots, gameplay clips, journals, guides", "Upload progress, folders and categories", "Short-lived signed links — files are never public unless you share them"]],
  ["Social", ["Optional public profile at /profile/you", "Friends, requests and blocking", "Share selected collections and media", "Report abuse"]],
  ["Privacy & control", ["Everything private by default", "Disconnect accounts at any time", "Export all your data as JSON", "Delete your account and files"]],
] as const;

export default function Features() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="h1">Built for gamers with too many launchers</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {SECTIONS.map(([t, items]) => (
          <div key={t} className="card"><h2 className="font-display font-bold text-cyan">{t}</h2>
            <ul className="mt-3 space-y-1 text-sm text-mute">{items.map((i) => <li key={i}>▸ {i}</li>)}</ul></div>
        ))}
      </div>
      <h2 className="mt-12 font-display text-xl font-bold">Platform connections</h2>
      <p className="mt-1 text-sm text-mute">We only use official sign-in and documented access. We never ask for your platform passwords.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONNECTORS.map((c) => (
          <div key={c.platform} className="card">
            <div className="flex items-center justify-between"><span className="font-semibold">{c.name}</span>
              <span className={`badge ${c.status === "available" ? "border-cyan text-cyan" : ""}`}>{c.status === "available" ? "Available" : "Planned"}</span></div>
            <p className="mt-2 text-xs text-mute">{c.caveat}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center"><Link href="/signup" className="btn-primary">Start free</Link></div>
    </div>
  );
}
