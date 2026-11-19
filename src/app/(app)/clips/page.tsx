import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { deleteMedia, updateMedia } from "@/app/actions";
import { AutoSelect, ConfirmButton } from "@/components/forms";
import { ClipUploader } from "@/components/clip-uploader";
import { ClipCard } from "@/components/clip-card";
import { Empty } from "@/components/ui";
import { listClips } from "@/lib/clips";
export const metadata = { title: "Clips" };

const TABS = [["friends", "Friends"], ["public", "Public"], ["mine", "My clips"]] as const;

export default async function Clips({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const tab = (TABS.find(([t]) => t === sp.tab)?.[0] ?? "friends") as "friends" | "public" | "mine";
  const { supabase, user } = await requireUser();
  const [clips, { data: games }] = await Promise.all([
    listClips(supabase, user.id, tab),
    supabase.from("user_games").select("games(id, title)").eq("user_id", user.id).limit(500),
  ]);
  const gameList = (games ?? []).map((g) => g.games as unknown as { id: string; title: string })
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <h1 className="h1">Clips</h1>
      <ClipUploader games={gameList} />
      <nav className="flex gap-2" aria-label="Clip feeds">
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/clips?tab=${t}`} aria-current={tab === t ? "page" : undefined}
            className={`badge px-3 py-1 text-sm ${tab === t ? "border-cyan text-cyan" : "hover:text-ink"}`}>{label}</Link>
        ))}
      </nav>
      {clips.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((c) => (
            <ClipCard key={c.id} clip={c} actions={c.owner_id === user.id && <>
              <form action={updateMedia} className="w-28"><input type="hidden" name="id" value={c.id} />
                <AutoSelect name="visibility" defaultValue={c.visibility} aria-label="Visibility">
                  <option value="private">Only me</option><option value="friends">Friends</option><option value="public">Public</option></AutoSelect></form>
              <form action={deleteMedia}><input type="hidden" name="id" value={c.id} />
                <ConfirmButton message="Delete this clip permanently?" className="text-xs text-red-300 hover:underline">Delete</ConfirmButton></form>
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
