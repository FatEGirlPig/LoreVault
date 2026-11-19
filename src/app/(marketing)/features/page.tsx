import Link from "next/link";
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
      <h2 className="mt-12 font-display text-xl font-bold">Steam sync</h2>
      <div className="card mt-4 text-sm text-mute">
        Sign in with Steam to import your library, playtime and achievements, complete with unlock dates and global rarity.
        We use Steam&apos;s official sign-in and never see your password. Games from PlayStation, Xbox, Nintendo and other stores can be added manually or by CSV.
      </div>
      <div className="mt-12 text-center"><Link href="/signup" className="btn-primary">Start free</Link></div>
    </div>
  );
}
