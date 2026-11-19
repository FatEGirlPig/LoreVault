import Link from "next/link";
import { CopyLink } from "./clip-uploader";

export type Clip = { id: string; title: string | null; filename: string; visibility: string; created_at: string; owner_id: string; game_title?: string | null; username?: string | null };

export function ClipCard({ clip, actions }: { clip: Clip; actions?: React.ReactNode }) {
  return (
    <article className="card overflow-hidden p-0">
      <video src={`/api/vault/${clip.id}/stream`} controls preload="metadata" playsInline className="aspect-video w-full bg-black" />
      <div className="space-y-1 p-4">
        <Link href={`/clip/${clip.id}`} className="block truncate font-semibold hover:text-cyan">{clip.title || clip.filename}</Link>
        <p className="text-xs text-mute">
          {clip.username ? <Link href={`/profile/${clip.username}`} className="hover:text-ink">@{clip.username}</Link> : "Unknown"}
          {clip.game_title && <> · {clip.game_title}</>} · {new Date(clip.created_at).toLocaleDateString()}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {clip.visibility !== "private" && <CopyLink path={`/clip/${clip.id}`} />}
          {actions}
        </div>
      </div>
    </article>
  );
}
