"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { embedUrl, thumbnailUrl } from "@/lib/clip-links";

type Clip = { id: string; provider: string; video_id: string; title: string | null; created_at: string; visibility: string; game_title: string | null; username: string | null };
const PROVIDER = { youtube: "YouTube", twitch: "Twitch", streamable: "Streamable" } as Record<string, string>;

/** Click-to-load embed: nothing from YouTube/Twitch loads until the viewer presses play. */
export function ClipCard({ clip, actions, footer }: { clip: Clip; actions?: React.ReactNode; footer?: React.ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [host, setHost] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setHost(location.hostname), []);
  const thumb = thumbnailUrl(clip.provider, clip.video_id);

  return (
    <article className="card overflow-hidden p-0">
      <div className="relative aspect-video bg-black">
        {playing && host ? (
          <iframe src={embedUrl(clip.provider, clip.video_id, host) + (clip.provider === "youtube" ? "?autoplay=1" : "")}
            title={clip.title ?? "Clip"} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Play ${clip.title ?? "clip"}`}
            className="group absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy to-void">
            {thumb && <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition group-hover:opacity-90" loading="lazy" />}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-violet to-cyan text-void shadow-lg transition group-hover:scale-110">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg></span>
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs">{PROVIDER[clip.provider]}</span>
          </button>
        )}
      </div>
      <div className="space-y-1 p-4">
        <Link href={`/clip/${clip.id}`} className="block truncate font-semibold hover:text-cyan">{clip.title || "Untitled clip"}</Link>
        <p className="text-xs text-mute">
          {clip.username ? <Link href={`/profile/${clip.username}`} className="hover:text-ink">@{clip.username}</Link> : "Unknown"}
          {clip.game_title && <> · {clip.game_title}</>} · {new Date(clip.created_at).toLocaleDateString()}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {clip.visibility !== "private" && <button type="button" className="text-xs text-mute hover:text-cyan" onClick={async () => {
            await navigator.clipboard.writeText(`${location.origin}/clip/${clip.id}`); setCopied(true); setTimeout(() => setCopied(false), 1500);
          }}>{copied ? "Link copied" : "Copy link"}</button>}
          {actions}
        </div>
        {footer && <div className="border-t border-line pt-3">{footer}</div>}
      </div>
    </article>
  );
}
