import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { addClip, deleteClip, updateClip } from "@/app/actions";
import { ActionForm, AutoSelect, ConfirmButton, Submit } from "@/components/forms";
import { ClipCard } from "@/components/clip-card";
import { Empty } from "@/components/ui";
import { listClips } from "@/lib/clips";
import { loadSocial } from "@/lib/social";
import { Social } from "@/components/social";
export const metadata = { title: "Clips" };

const TABS = [["friends", "Friends"], ["public", "Public"], ["mine", "My clips"]] as const;

export default async function Clips({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const tab = (TABS.find(([t]) => t === sp.tab)?.[0] ?? "friends") as "friends" | "public" | "mine";
  const { supabase, user } = await requireUser();
  const [clips, { data: games }] = await Promise.all([
    listClips(supabase, user.id, tab),
    supabase.from("user_games").select("games(id, title)").eq("user_id", user.id).limit(1000),
  ]);
  const social = await loadSocial(supabase, user.id, "clip", clips.map((c) => c.id));
  const gameList = (games ?? []).map((g) => g.games as unknown as { id: string; title: string }).sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <h1 className="h1">Clips</h1>
      <div className="card">
        <h2 className="mb-1 font-display font-bold">Share a clip</h2>
        <p className="mb-3 text-xs text-mute">Paste a link from YouTube, Twitch clips or Streamable.</p>
        <ActionForm action={addClip} className="grid gap-3 sm:grid-cols-2">
          <input name="url" type="url" required placeholder="https://youtu.be/… or https://clips.twitch.tv/…" className="input sm:col-span-2" aria-label="Clip link" />
          <input name="title" maxLength={100} placeholder="Title (e.g. Clutch 1v4)" className="input sm:col-span-2" aria-label="Title" />
          <select name="game_id" className="input" aria-label="Game"><option value="">No game tagged</option>
            {gameList.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
          <select name="visibility" defaultValue="public" className="input" aria-label="Who can see it">
            <option value="private">Only me</option><option value="friends">Friends</option><option value="public">Public</option></select>
          <Submit className="btn-primary sm:col-span-2">Post clip</Submit>
        </ActionForm>
      </div>
      <nav className="flex gap-2" aria-label="Clip feeds">
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/clips?tab=${t}`} aria-current={tab === t ? "page" : undefined}
            className={`badge px-3 py-1 text-sm ${tab === t ? "border-cyan text-cyan" : "hover:text-ink"}`}>{label}</Link>
        ))}
      </nav>
      {clips.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((c) => (
            <ClipCard key={c.id} clip={c} footer={<Social type="clip" id={c.id} data={social.get(c.id)} viewer={user.id} path={`/clips?tab=${tab}`} />} actions={c.user_id === user.id && <>
              <form action={updateClip} className="w-28"><input type="hidden" name="id" value={c.id} />
                <AutoSelect name="visibility" defaultValue={c.visibility} aria-label="Visibility">
                  <option value="private">Only me</option><option value="friends">Friends</option><option value="public">Public</option></AutoSelect></form>
              <form action={deleteClip}><input type="hidden" name="id" value={c.id} />
                <ConfirmButton message="Delete this clip?" className="text-xs text-red-300 hover:underline">Delete</ConfirmButton></form>
            </>} />
          ))}
        </div>
      ) : (
        <Empty title={tab === "friends" ? "No clips from friends yet" : tab === "public" ? "No public clips yet" : "You haven't posted any clips"}>
          {tab === "friends" ? <><Link href="/friends" className="text-cyan">Add friends</Link> to see their clips here.</> : "Post one above to get things started."}
        </Empty>
      )}
    </div>
  );
}
