export type ClipProvider = "youtube" | "twitch" | "streamable";
export type ParsedClip = { provider: ClipProvider; videoId: string };

/** Recognise YouTube, Twitch clip and Streamable links. Returns null for anything else. */
export function parseClipUrl(raw: string): ParsedClip | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const yt = /^[\w-]{11}$/;
  if (host === "youtu.be" && yt.test(parts[0] ?? "")) return { provider: "youtube", videoId: parts[0] };
  if (host === "youtube.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v && yt.test(v)) return { provider: "youtube", videoId: v };
    if (["shorts", "embed", "live"].includes(parts[0]) && yt.test(parts[1] ?? "")) return { provider: "youtube", videoId: parts[1] };
  }
  const slug = /^[\w-]{3,100}$/;
  if (host === "clips.twitch.tv" && slug.test(parts[0] ?? "")) return { provider: "twitch", videoId: parts[0] };
  if (host === "twitch.tv" && parts[1] === "clip" && slug.test(parts[2] ?? "")) return { provider: "twitch", videoId: parts[2] };
  if (host === "streamable.com" && /^[a-z0-9]{3,20}$/i.test(parts.at(-1) ?? "")) return { provider: "streamable", videoId: parts.at(-1)! };
  return null;
}

export function embedUrl(provider: string, videoId: string, parentHost: string): string {
  const id = encodeURIComponent(videoId);
  if (provider === "youtube") return `https://www.youtube-nocookie.com/embed/${id}`;
  if (provider === "twitch") return `https://clips.twitch.tv/embed?clip=${id}&parent=${encodeURIComponent(parentHost)}&autoplay=false`;
  return `https://streamable.com/e/${id}`;
}

export function thumbnailUrl(provider: string, videoId: string): string | null {
  return provider === "youtube" ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : null;
}
