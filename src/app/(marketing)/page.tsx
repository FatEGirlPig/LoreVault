import Link from "next/link";

const FEATURES = [
  ["Unified library", "Every game you own across Steam and other platforms, in one searchable collection."],
  ["Personal Vault", "10 GB of private storage for screenshots, clips, notes and guides — free."],
  ["Private by default", "Nothing is shared until you choose. Control visibility per profile, collection and file."],
  ["Honest sync", "See exactly what each platform shares, when it last synced, and what to add manually."],
];

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:pt-24">
        <p className="badge mx-auto mb-6">Free forever · 10 GB included</p>
        <h1 className="fade-in font-display text-4xl font-black leading-tight tracking-wide sm:text-6xl">
          Your entire gaming universe.<br /><span className="glow-text">One place.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-mute">
          LoreVault brings your game libraries together, keeps your gaming memories safe, and lets you share only what you want.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Create your free vault</Link>
          <Link href="/features" className="btn-ghost px-6 py-3 text-base">See how it works</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([t, d]) => (
          <div key={t} className="card fade-in"><h2 className="font-display text-sm font-bold tracking-wider text-cyan">{t}</h2><p className="mt-2 text-sm text-mute">{d}</p></div>
        ))}
      </section>
      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="card text-center">
          <h2 className="font-display text-xl font-bold">The library is always free.</h2>
          <p className="mt-2 text-mute">Organizing your games never needs a subscription. Paid plans only add storage space for your archive.</p>
          <Link href="/pricing" className="btn-ghost mt-4">View storage plans</Link>
        </div>
      </section>
    </>
  );
}
