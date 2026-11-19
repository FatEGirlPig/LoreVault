import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { PLATFORM_LABEL } from "@/components/ui";
import { ClipCard } from "@/components/clip-card";
import { listClips } from "@/lib/clips";
import { gamerProgress, loadStats } from "@/lib/stats";
import Link from "next/link";
import { Badges } from "@/components/badges";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const card = `/api/card/${encodeURIComponent(username.toLowerCase())}`;
  return { title: `@${username}`, openGraph: { images: [card] }, twitter: { card: "summary_large_image", images: [card] } };
}

// All reads go through RLS: anything the viewer may not see simply isn't returned.
export default async function Profile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { supabase, user } = await getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).single();
  if (!profile) notFound();

  const [{ data: games }, { data: collections }, clips, { data: ach }] = await Promise.all([
    supabase.from("user_games").select("id, platform, status, games(title, cover_url)").eq("user_id", profile.id).limit(48),
    supabase.from("collections").select("id, name, collection_games(count)").eq("user_id", profile.id).order("position"),
    listClips(supabase, user?.id ?? "", "public", profile.id),
    supabase.from("user_achievements").select("unlocked, total").eq("user_id", profile.id).gt("total", 0),
  ]);
  const full = await loadStats(supabase, profile.id);
  const { badges } = full;
  const lvl = gamerProgress(full).level;
  const accent = profile.accent ?? "#8b5cf6";
  const [{ data: banner }, { data: showcase }] = await Promise.all([
    profile.banner_game_id ? supabase.from("games").select("background_url, cover_url").eq("id", profile.banner_game_id).maybeSingle() : Promise.resolve({ data: null }),
    (profile.showcase as string[]).length ? supabase.from("user_games").select("id, playtime_minutes, games(title, cover_url), user_achievements(unlocked, total)").in("id", profile.showcase) : Promise.resolve({ data: [] }),
  ]);
  const pinned = (profile.pinned as { ugId: string; id: string }[]).map((p) => {
    const r = full.rows.find((x) => x.user_game_id === p.ugId); const a = r?.items.find((i) => i.id === p.id);
    return a && r ? { ...a, game: r.user_games.games.title } : null;
  }).filter(Boolean) as (import("@/lib/integrations/steam").Achievement & { game: string })[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="card relative overflow-hidden" style={{ borderColor: accent }}>
        {(banner?.background_url || banner?.cover_url) && <img src={banner.background_url ?? banner.cover_url!} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="h1">{profile.display_name || profile.username}</h1><p className="text-sm text-mute">@{profile.username}</p></div>
          <div className="text-right"><span className="rounded-full px-3 py-1 font-display text-sm font-bold text-void" style={{ background: accent }}>Lv {lvl.level}</span>
            {user && user.id !== profile.id && <div className="mt-2"><Link href={`/compare/${profile.username}`} className="btn-ghost">⚔️ Compare with me</Link></div>}</div>
        </div>
        {profile.bio && <p className="mt-3 max-w-2xl">{profile.bio}</p>}
        {!!ach?.length && <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-cyan text-cyan">🏆 {ach.reduce((t, a) => t + a.unlocked, 0).toLocaleString()} achievements</span>
          <span className="badge">{ach.filter((a) => a.unlocked === a.total).length} perfect games</span></div>}
        {user?.id === profile.id && <p className="mt-3 text-xs text-mute">You&apos;re viewing your own profile. <Link href="/settings#look" className="underline">Customize it</Link>.</p>}
        </div>
      </div>
      {!!showcase?.length && <section className="mt-8"><h2 className="mb-3 font-display font-bold">Showcase</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{showcase.map((s) => {
          const g = s.games as unknown as { title: string; cover_url: string | null }; const a = s.user_achievements as unknown as { unlocked: number; total: number } | null;
          return <li key={s.id} className="card overflow-hidden p-0" style={{ borderColor: accent }}>
            {g.cover_url && <img src={g.cover_url} alt="" className="aspect-[46/21] w-full object-cover" loading="lazy" />}
            <div className="p-3 text-sm"><p className="truncate font-semibold">{g.title}</p>
              <p className="text-xs text-mute">{Math.round((s.playtime_minutes ?? 0) / 60)}h{a?.total ? ` · ${a.unlocked}/${a.total} 🏆` : ""}</p></div></li>;
        })}</ul></section>}
      {!!pinned.length && <section className="mt-8"><h2 className="mb-3 font-display font-bold">Pinned achievements</h2>
        <ul className="grid gap-3 sm:grid-cols-3">{pinned.map((a) => (
          <li key={a.game + a.id} className="flex gap-3 rounded-xl border p-3" style={{ borderColor: accent }}>
            {a.icon && <img src={a.icon} alt="" className="h-12 w-12 rounded-lg" />}
            <div className="min-w-0"><p className="truncate font-semibold">{a.name}</p><p className="truncate text-xs text-mute">{a.game}</p>
              {a.globalPercent != null && <p className="text-xs" style={{ color: accent }}>{a.globalPercent}% of players</p>}</div></li>))}</ul></section>}
      {badges.some((b) => b.earned) && <section className="mt-8"><h2 className="mb-3 font-display font-bold">Badges</h2><Badges badges={badges} earnedOnly /></section>}
      {!!collections?.length && <section className="mt-8">
        <h2 className="font-display font-bold">Collections</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">{collections.map((c) => (
          <div key={c.id} className="card"><p className="font-semibold">{c.name}</p>
            <p className="text-xs text-mute">{(c.collection_games as unknown as { count: number }[])[0]?.count ?? 0} games</p></div>))}</div>
      </section>}
      {!!games?.length && <section className="mt-8">
        <h2 className="font-display font-bold">Library</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{games.map((g) => {
          const game = g.games as unknown as { title: string; cover_url: string | null };
          return <div key={g.id} className="card p-3"><p className="truncate text-sm font-semibold">{game.title}</p><p className="text-xs text-mute">{PLATFORM_LABEL[g.platform] ?? g.platform}</p></div>;
        })}</div>
      </section>}
      {!!clips.length && <section className="mt-8">
        <h2 className="font-display font-bold">Clips</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{clips.map((c) => <ClipCard key={c.id} clip={c} />)}</div>
      </section>}
      {!games?.length && !collections?.length && !clips.length && <p className="mt-8 text-mute">Nothing shared here yet.</p>}
    </div>
  );
}
