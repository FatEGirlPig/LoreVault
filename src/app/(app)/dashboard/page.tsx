import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { Empty, PLATFORM_LABEL } from "@/components/ui";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count }, { data: recent }, { data: accounts }, { data: ach }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("user_games").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_games").select("id, platform, playtime_minutes, games(title, cover_url)").eq("user_id", user.id)
      .order("playtime_minutes", { ascending: false, nullsFirst: false }).limit(6),
    supabase.from("connected_accounts").select("platform, status, last_synced_at").eq("user_id", user.id),
    supabase.from("user_achievements").select("unlocked, total").eq("user_id", user.id).gt("total", 0),
  ]);
  const unlocked = (ach ?? []).reduce((t, a) => t + a.unlocked, 0);
  const perfect = (ach ?? []).filter((a) => a.unlocked === a.total).length;
  const hours = (recent ?? []).reduce((t, g) => t + (g.playtime_minutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="h1">Welcome back{profile?.username ? `, ${profile.username}` : ""}</h1>
      {!profile?.username && (
        <div className="card border-violet"><p className="font-semibold">Pick a username to finish setting up</p>
          <p className="mt-1 text-sm text-mute">Your profile stays private until you choose otherwise.</p>
          <Link href="/settings" className="btn-primary mt-3">Set username</Link></div>
      )}
      {!accounts?.length && (
        <div className="card flex flex-wrap items-center justify-between gap-4 border-cyan/50">
          <div><p className="font-semibold">Connect Steam to bring your library to life</p>
            <p className="text-sm text-mute">Import every game, your playtime and every achievement in one click.</p></div>
          <a href="/api/connections/steam/start" className="btn-primary">Sign in with Steam</a>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat href="/library" label="Games" value={count ?? 0} />
        <Stat href="/achievements" label="Achievements" value={unlocked.toLocaleString()} />
        <Stat href="/achievements" label="Perfect games" value={perfect} />
        <Stat href="/library?sort=playtime" label="Top-6 playtime" value={`${Math.round(hours / 60)}h`} />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Most played</h2><Link href="/library?sort=playtime" className="text-sm text-cyan">Library →</Link></div>
        {recent?.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{recent.map((g) => {
          const game = g.games as unknown as { title: string; cover_url: string | null };
          return <li key={g.id}><Link href={`/library/${g.id}`} className="card block overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-violet">
            {game.cover_url ? <img src={game.cover_url} alt="" className="aspect-[46/21] w-full object-cover" loading="lazy" />
              : <div className="flex aspect-[46/21] items-center justify-center bg-navy font-display text-2xl text-violet">{game.title[0]}</div>}
            <div className="flex justify-between gap-2 p-3 text-sm"><span className="truncate font-semibold">{game.title}</span>
              <span className="shrink-0 text-mute">{g.playtime_minutes ? `${Math.round(g.playtime_minutes / 60)}h` : PLATFORM_LABEL[g.platform]}</span></div>
          </Link></li>;
        })}</ul> : <Empty title="No games yet"><Link href="/connections" className="text-cyan">Connect Steam</Link> or <Link href="/library" className="text-cyan">add a game</Link>.</Empty>}
      </section>
      {accounts?.map((a) => (
        <p key={a.platform} className={`text-xs ${a.status === "error" ? "text-red-300" : "text-mute"}`}>
          Steam: {a.status === "error" ? <>sync error · <Link href="/connections" className="underline">fix</Link></> : a.last_synced_at ? `last synced ${new Date(a.last_synced_at).toLocaleString()}` : "not yet synced"}
        </p>
      ))}
    </div>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: React.ReactNode }) {
  return <Link href={href} className="card block transition hover:border-violet"><p className="label">{label}</p><p className="glow-text font-display text-3xl font-bold">{value}</p></Link>;
}
