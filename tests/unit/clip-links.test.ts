import { describe, expect, it } from "vitest";
import { embedUrl, parseClipUrl } from "@/lib/clip-links";

describe("parseClipUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "youtube", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://clips.twitch.tv/FunnyClipSlug-abc123", "twitch", "FunnyClipSlug-abc123"],
    ["https://www.twitch.tv/streamer/clip/FunnyClipSlug-abc123", "twitch", "FunnyClipSlug-abc123"],
    ["https://streamable.com/abc12", "streamable", "abc12"],
  ])("%s", (url, provider, videoId) => expect(parseClipUrl(url)).toEqual({ provider, videoId }));
  it("rejects other sites and junk", () => {
    for (const u of ["https://evil.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "not a url", "https://youtube.com/watch?v=short"])
      expect(parseClipUrl(u)).toBeNull();
  });
  it("builds Twitch embeds with the parent host", () => expect(embedUrl("twitch", "Abc", "vaultheim.gg")).toContain("parent=vaultheim.gg"));
});
