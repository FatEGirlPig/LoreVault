import Link from "next/link";
export const metadata = { title: "Features" };

const SECTIONS = [
  ["Library", ["Every Steam game imported automatically, with playtime", "Add PlayStation, Xbox, Nintendo and other games by hand or CSV", "Search, sort and filter; notes, ratings and play status", "Custom collections and wishlists"]],
  ["Achievements", ["Every Steam achievement across your library", "Completion bars and perfect-game tracking", "Unlock dates and global rarity — see your rarest wins", "Achievement stats on your public profile"]],
  ["Clips", ["Share clips from YouTube, Twitch or Streamable", "Tag the game and choose who can see it", "Friends and public feeds", "A shareable link for every clip"]],
  ["Friends & privacy", ["Friend requests, blocking and reporting", "Public profile by default — change anything, anytime", "Choose exactly what your profile shows", "Export or delete your data anytime"]],
] as const;

export default function Features() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="h1">Everything you play, all in one place</h1>
      <p className="mt-2 text-mute">Vaultheim is completely free. No plans, no paywalls.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {SECTIONS.map(([t, items]) => (
          <div key={t} className="card"><h2 className="font-display font-bold text-cyan">{t}</h2>
            <ul className="mt-3 space-y-1 text-sm text-mute">{items.map((i) => <li key={i}>▸ {i}</li>)}</ul></div>
        ))}
      </div>
      <p className="mt-8 text-sm text-mute">We use Steam&apos;s official sign-in and never see your Steam password. <a href="/security" className="text-cyan hover:underline">How we keep your account safe →</a></p>
      <div className="mt-8 text-center"><Link href="/signup" className="btn-primary">Get started free</Link></div>
    </div>
  );
}
