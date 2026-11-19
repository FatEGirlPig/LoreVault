import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { Empty, PLATFORM_LABEL } from "@/components/ui";
import { autoSyncIfStale } from "@/lib/auto-sync";
import { adminClient } from "@/lib/supabase/server";
import { gamerProgress, loadStats } from "@/lib/stats";
import { loadSocial } from "@/lib/social";
import { Social } from "@/components/social";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count }, { data: recent }, { data: accounts }, { data: ach }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("user_games").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_games").select("id, platform, playtime_minutes, games(title, cover_url)").eq("user_id", user.id)
      .order("playtime_minutes", { ascending: false, nullsFirst: false }).limit(6),
    supabase.from("connected_accounts").select("id, platform, status, last_synced_at").eq("user_id", user.id),
    supabase.from("user_achievements").select("unlocked, total").eq("user_id", user.id).gt("total", 0),
  ]);
  autoSyncIfStale(user.id, accounts);
  // Feed: RLS returns your own events plus friends' events they chose to share.
  const [{ data: events }, full] = await Promise.all([
    supabase.from("activity_events").select("id, user_id, kind, payload, created_at").order("created_at", { ascending: false }).limit(25),
    loadStats(supabase, user.id),
  ]);
  const g = gamerProgress(full);
  const social = await loadSocial(supabase, user.id, "activity", (events ?? []).map((e) => e.id));
  const ids = [...new Set((events ?? []).map((e) => e.user_id))];
  const { data: names } = ids.length ? await adminClient().from("profiles").select("id, username").in("id", ids) : { data: [] };
  const who = (id: string) => id === user.id ? "You" : names?.find((n) => n.id === id)?.username ?? "A friend";
  const unlocked = (ach ?? []).reduce((t, a) => t + a.unlocked, 0);
  const perfect = (ach ?? []).filter((a) => a.unlocked === a.total).length;
  const hours = (recent ?? []).reduce((t, g) => t + (g.playtime_minutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="h1">Welcome back{profile?.username ? `, ${profile.username}` : ""}</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <div className="flex items-baseline justify-between"><p className="label">Gamer level</p><span className="text-xs text-mute">{g.level.xp.toLocaleString()} XP</span></div>
          <p className="glow-text font-display text-4xl font-black">Lv {g.level.level}</p>
          <div className="mt-2 h-2 rounded-full bg-navy"><div className="h-2 rounded-full bg-gradient-to-r from-violet to-cyan" style={{ width: `${g.level.pct}%` }} /></div>
          <p className="mt-1 text-xs text-mute">{(g.level.needed - g.level.into).toLocaleString()} XP to level {g.level.level + 1}</p>
        </div>
        <div className="card">
          <p className="label">Achievement streak</p>
          <p className="font-display text-4xl font-black">{g.streak.current > 0 ? "🔥" : "🧊"} {g.streak.current} <span className="text-base font-normal text-mute">day{g.streak.current === 1 ? "" : "s"}</span></p>
          <p className="mt-1 text-xs text-mute">{g.streak.current === 0 ? "Unlock an achievement today to start a streak." : g.streak.activeToday ? "You're on fire today!" : "Unlock one today to keep it alive!"} · Best: {g.streak.best}</p>
        </div>
        <div className="card">
          <p className="label">Weekly challenges</p>
          <ul className="mt-1 space-y-2">{g.week.map((c) => (
            <li key={c.id} className="text-xs"><div className="flex justify-between gap-2"><span className={c.done ? "text-cyan" : ""}>{c.done ? "✓ " : ""}{c.title}</span><span className="text-mute">{c.progress}/{c.goal}</span></div>
              <div className="mt-1 h-1 rounded-full bg-navy"><div className="h-1 rounded-full bg-cyan" style={{ width: `${(c.progress / c.goal) * 100}%` }} /></div></li>))}</ul>
          <p className="mt-2 text-[11px] text-mute">+150 XP each · resets Monday</p>
        </div>
      </div>
      {!profile?.username && (
        <div className="card border-violet"><p className="font-semibold">Pick a username to finish setting up</p>
          <p className="mt-1 text-sm text-mute">Your username is how friends find you and how you appear on leaderboards.</p>
          <Link href="/settings" className="btn-primary mt-3">Set username</Link></div>
      )}
      {!accounts?.length && (
        <div className="card flex flex-wrap items-center justify-between gap-4 border-cyan/50">
          <div><p className="font-semibold">Connect Steam to bring your library to life</p>
            <p className="text-sm text-mute">Import every game, your playtime and every achievement in one click. We never see your Steam password. <a href="/security" className="text-cyan hover:underline">Why it&apos;s safe</a></p></div>
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
      <section>
        <h2 className="mb-3 font-display font-bold">Activity</h2>
        {events?.length ? <ul className="card divide-y divide-line p-0">{events.map((e) => {
          const p = e.payload as { game: string; ugId: string; name: string; icon: string; percent: number | null };
          const mine = e.user_id === user.id;
          return <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            {e.kind === "perfect" ? <span className="flex h-10 w-10 shrink-0 items-center justify-center text-2xl">🏆</span>
              : p.icon ? <img src={p.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg" loading="lazy" /> : <span className="h-10 w-10 shrink-0 rounded-lg bg-navy" />}
            <p className="min-w-0 flex-1">
              <span className="font-semibold">{mine ? "You" : <Link href={`/profile/${who(e.user_id)}`} className="hover:text-cyan">{who(e.user_id)}</Link>}</span>
              {e.kind === "perfect" ? <> completed <b>{p.game}</b> 100%!</>
                : <> unlocked <b>{p.name}</b> in {mine ? <Link href={`/library/${p.ugId}`} className="hover:text-cyan">{p.game}</Link> : p.game}
                  {p.percent != null && p.percent < 10 && <span className="text-violet"> · {p.percent}% rare</span>}</>}
            </p>
            <time className="shrink-0 text-xs text-mute">{new Date(e.created_at).toLocaleDateString()}</time>
            <div className="basis-full pl-[52px]"><Social type="activity" id={e.id} data={social.get(e.id)} viewer={user.id} path="/dashboard" /></div>
          </li>;
        })}</ul> : <Empty title="No activity yet">New achievements you and your friends unlock show up here. Friends need Settings → Privacy → Activity set to Friends.</Empty>}
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
