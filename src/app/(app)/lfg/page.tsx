import Link from "next/link";
import { adminClient, getUser } from "@/lib/supabase/server";
import { createLfg, deleteLfg, toggleLfgJoin } from "@/app/actions";
import { ActionForm, ConfirmButton, Submit } from "@/components/forms";
import { Empty } from "@/components/ui";
export const metadata = { title: "Looking for Group" };

export default async function Lfg() {
  const { supabase, user } = await getUser();
  const { data: posts } = await supabase.from("lfg_posts").select("*, lfg_joins(user_id)").gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(60);
  const ids = [...new Set((posts ?? []).flatMap((p) => [p.user_id, ...(p.lfg_joins as { user_id: string }[]).map((j) => j.user_id)]))];
  const { data: names } = ids.length ? await adminClient().from("profiles").select("id, username").in("id", ids) : { data: [] };
  const name = (id: string) => names?.find((n) => n.id === id)?.username ?? "player";

  return (
    <div className="space-y-6">
      <h1 className="h1">Looking for Group</h1>
      {!user ? <div className="card text-sm"><Link href="/signup" className="text-cyan">Sign up free</Link> to post or join a group.</div> : <details className="card" open={!posts?.length}>
        <summary className="cursor-pointer font-display font-bold">+ Find teammates</summary>
        <ActionForm action={createLfg} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="game_title" required maxLength={120} placeholder="Game (e.g. Deep Rock Galactic)" className="input sm:col-span-2" aria-label="Game" />
          <label><span className="label">Players needed</span><input name="slots" type="number" min={1} max={20} defaultValue={2} className="input" /></label>
          <label><span className="label">When</span><input name="play_time" maxLength={60} placeholder="Tonight 8pm EST" className="input" /></label>
          <label><span className="label">Platform</span><select name="platform" className="input">
            {["PC", "PlayStation", "Xbox", "Switch", "Crossplay"].map((p) => <option key={p}>{p}</option>)}</select></label>
          <label><span className="label">Post lasts</span><select name="hours" defaultValue="24" className="input">
            <option value="3">3 hours</option><option value="12">12 hours</option><option value="24">1 day</option><option value="72">3 days</option></select></label>
          <textarea name="note" maxLength={300} rows={2} placeholder="Mic required, chill vibes, going for the hard achievements…" className="input sm:col-span-2" />
          <label><span className="label">Who can see it</span><select name="visibility" defaultValue="public" className="input">
            <option value="public">Everyone</option><option value="friends">Friends</option></select></label>
          <div className="flex items-end"><Submit>Post</Submit></div>
        </ActionForm>
      </details>}
      {posts?.length ? <ul className="grid gap-3 md:grid-cols-2">{posts.map((p) => {
        const joined = (p.lfg_joins as { user_id: string }[]);
        const mine = p.user_id === user?.id, inIt = joined.some((j) => j.user_id === user?.id), full = joined.length >= p.slots;
        return (
          <li key={p.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-display font-bold">{p.game_title}</p>
                <p className="text-xs text-mute"><Link href={`/profile/${name(p.user_id)}`} className="hover:text-ink">@{name(p.user_id)}</Link>
                  {p.platform && <> · {p.platform}</>}{p.play_time && <> · {p.play_time}</>}</p></div>
              <span className={`badge ${full ? "" : "border-cyan text-cyan"}`}>{joined.length}/{p.slots}</span>
            </div>
            {p.note && <p className="text-sm">{p.note}</p>}
            {!!joined.length && <p className="text-xs text-mute">Joined: {joined.map((j) => `@${name(j.user_id)}`).join(", ")}</p>}
            <div className="flex gap-2">
              {!user ? <Link href="/signup" className="btn-primary">Join</Link> : mine ? <form action={deleteLfg}><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Close this post?">Close</ConfirmButton></form>
                : <form action={toggleLfgJoin}><input type="hidden" name="id" value={p.id} />
                    <Submit className={inIt ? "btn-ghost" : "btn-primary"}>{inIt ? "Leave" : full ? "Full" : "Join"}</Submit></form>}
            </div>
            <p className="text-[11px] text-mute">Expires {new Date(p.expires_at).toLocaleString()}</p>
          </li>);
      })}</ul> : <Empty title="No open groups right now">Be the first: post what you want to play.</Empty>}
    </div>
  );
}
