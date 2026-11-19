import Link from "next/link";
import { addComment, deleteComment, toggleReaction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import type { SocialData } from "@/lib/social";

const EMOJI = ["🔥", "👏", "😂", "😮", "GG"];

export function Social({ type, id, data, viewer, path }: { type: "clip" | "activity"; id: string; data?: SocialData; viewer: string; path: string }) {
  const d = data ?? { reactions: {}, comments: [] };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {EMOJI.map((e) => {
          const r = d.reactions[e];
          return (
            <form key={e} action={toggleReaction}>
              <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
              <input type="hidden" name="emoji" value={e} /><input type="hidden" name="path" value={path} />
              <button aria-pressed={!!r?.mine} aria-label={`React ${e}`}
                className={`rounded-full border px-2 py-0.5 text-xs transition ${r?.mine ? "border-cyan bg-cyan/10 text-cyan" : "border-line text-mute hover:border-violet hover:text-ink"}`}>
                {e}{r?.count ? <span className="ml-1">{r.count}</span> : null}
              </button>
            </form>);
        })}
      </div>
      {d.comments.length > 0 && <ul className="space-y-1 text-xs">{d.comments.slice(-5).map((c) => (
        <li key={c.id} className="flex gap-2">
          <span className="min-w-0 flex-1"><Link href={c.username ? `/profile/${c.username}` : "#"} className="font-semibold hover:text-cyan">{c.username ?? "user"}</Link> <span className="text-mute">{c.body}</span></span>
          {c.user_id === viewer && <form action={deleteComment}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="path" value={path} />
            <button className="text-mute hover:text-red-300" aria-label="Delete comment">×</button></form>}
        </li>))}</ul>}
      <ActionForm action={addComment} className="flex gap-2">
        <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} /><input type="hidden" name="path" value={path} />
        <input name="body" maxLength={500} placeholder="Add a comment…" className="input py-1 text-xs" aria-label="Comment" required />
      </ActionForm>
    </div>
  );
}
