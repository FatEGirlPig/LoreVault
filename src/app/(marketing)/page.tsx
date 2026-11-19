import Link from "next/link";
import { getUser } from "@/lib/supabase/server";

const FEATURES = [
  ["🎮", "Your whole library", "Sign in with Steam and every game you own appears instantly — with playtime. Add console games by hand."],
  ["🏆", "A real trophy room", "Every achievement across every game: completion bars, perfect games, unlock dates and how rare each one is."],
  ["🎬", "Share your best plays", "Post clips from YouTube, Twitch or Streamable. Show friends, or the whole world."],
  ["👥", "Game with friends", "Add friends, see their clips and compare achievements. You choose what your profile shows."],
];

export default async function Home() {
  const { user } = await getUser();
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:pt-24">
        <p className="badge mx-auto mb-6">100% free · No subscriptions, ever</p>
        <h1 className="fade-in font-display text-4xl font-black leading-tight tracking-wide sm:text-6xl">
          Your entire gaming universe.<br /><span className="glow-text">One place.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-mute">
          Bring your Steam library, every achievement and your best clips together — and show them off to your friends.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">Welcome back — enter LoreVault →</Link>
            : <Link href="/signup" className="btn-primary px-6 py-3 text-base">Get started — it&apos;s free</Link>}
          <Link href="/leaderboard?scope=global" className="btn-ghost px-6 py-3 text-base">Explore without an account</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([icon, t, d]) => (
          <div key={t} className="card fade-in transition hover:-translate-y-1 hover:border-violet">
            <div className="text-3xl" aria-hidden>{icon}</div>
            <h2 className="mt-3 font-display text-sm font-bold tracking-wider text-cyan">{t}</h2>
            <p className="mt-2 text-sm text-mute">{d}</p></div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-4 text-center font-display text-xl font-bold">Take a look around, no account needed</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[["/leaderboard?scope=global", "🌍", "Global leaderboard"], ["/speedruns", "⏱️", "World-record speedruns"], ["/clips?tab=public", "🎬", "Community clips"],
            ["/lfg", "🎮", "Looking for group"], ["/groups", "👥", "Groups & clans"]].map(([href, icon, label]) => (
            <Link key={href} href={href} className="card text-center transition hover:-translate-y-1 hover:border-violet">
              <div className="text-3xl" aria-hidden>{icon}</div><p className="mt-2 text-sm font-semibold">{label}</p></Link>))}
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="card text-center">
          <h2 className="font-display text-xl font-bold">Set up in under a minute</h2>
          <ol className="mx-auto mt-4 grid max-w-2xl gap-3 text-left text-sm text-mute sm:grid-cols-3">
            <li><span className="text-cyan">1.</span> Create a free account</li>
            <li><span className="text-cyan">2.</span> Sign in with Steam</li>
            <li><span className="text-cyan">3.</span> Explore your trophy room</li>
          </ol>
          <Link href={user ? "/dashboard" : "/signup"} className="btn-primary mt-6">{user ? "Go to my dashboard" : "Create my account"}</Link>
        </div>
      </section>
    </>
  );
}
