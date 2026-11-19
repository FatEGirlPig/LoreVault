import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { PLATFORM_LABEL } from "@/components/ui";
import { ClipCard } from "@/components/clip-card";
import { listClips } from "@/lib/clips";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="card">
        <h1 className="h1">{profile.display_name || profile.username}</h1>
        <p className="text-sm text-mute">@{profile.username}</p>
        {profile.bio && <p className="mt-3 max-w-2xl">{profile.bio}</p>}
        {!!ach?.length && <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-cyan text-cyan">🏆 {ach.reduce((t, a) => t + a.unlocked, 0).toLocaleString()} achievements</span>
          <span className="badge">{ach.filter((a) => a.unlocked === a.total).length} perfect games</span></div>}
        {user?.id === profile.id && <p className="mt-3 text-xs text-mute">You&apos;re viewing your own profile. Others only see what your privacy settings allow.</p>}
      </div>
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
