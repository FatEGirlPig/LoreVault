import Link from "next/link";
export const metadata = { title: "Steam account security", description: "How Vaultheim keeps your Steam account safe." };

const POINTS: [string, string, string][] = [
  ["🔐", "Your password never touches Vaultheim", "You sign in on Steam's own website (steamcommunity.com) using Steam's official sign-in. Steam only tells us your public Steam ID. We never see your password or Steam Guard codes."],
  ["✅", "Every sign-in is checked with Steam", "Before we trust a login, our server asks Steam directly to confirm it's genuine, so a faked response can't link the wrong account."],
  ["🛡️", "Protected against forged links", "Each “Connect Steam” click gets a one-time secret code. The link only completes if that code comes back, so nobody can trick you into linking an account."],
  ["🚫", "We can't touch your account", "Steam gives us no permission to act for you. Vaultheim cannot buy, sell, trade, move items, change settings or read anything private."],
  ["👀", "Public, read-only data", "We only read what Steam already makes public: your games, playtime and achievements. If your Steam profile is private, we can't see it."],
  ["🔗", "One Steam account, one owner", "A Steam account can only be linked to one Vaultheim account."],
  ["🎛️", "You're in control", "Disconnect Steam anytime from the Steam page, optionally deleting imported games. Your Steam ID is private by default, and you can export or delete all your data from Settings."],
];

export default function Security() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="badge mb-4">Security</p>
      <h1 className="h1">Your Steam account stays safe</h1>
      <p className="mt-3 text-mute">Vaultheim was built so it never has the ability to access or change your Steam account. Here&apos;s exactly how.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {POINTS.map(([icon, title, body]) => (
          <li key={title} className="card">
            <div className="text-2xl" aria-hidden>{icon}</div>
            <h2 className="mt-2 font-display font-bold">{title}</h2>
            <p className="mt-1 text-sm text-mute">{body}</p>
          </li>
        ))}
      </ul>
      <div className="card mt-8 border-amber-400/50">
        <h2 className="font-display font-bold text-amber-300">⚠️ Spot a fake login page</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>▸ The real Steam sign-in always shows <b>https://steamcommunity.com</b> with a padlock in your address bar.</li>
          <li>▸ Vaultheim will <b>never</b> ask for your Steam password, Steam Guard code or email login, in chat, email or anywhere else.</li>
          <li>▸ Never type your Steam password on a site whose address isn&apos;t steamcommunity.com or store.steampowered.com.</li>
          <li>▸ Turn on <b>Steam Guard</b> (Steam → Settings → Security) for extra protection.</li>
        </ul>
      </div>
      <p className="mt-8 text-xs text-mute">Vaultheim is not affiliated with Valve or Steam. Steam and the Steam logo are trademarks of Valve Corporation.</p>
      <div className="mt-6"><Link href="/signup" className="btn-primary">Get started free</Link></div>
    </div>
  );
}
