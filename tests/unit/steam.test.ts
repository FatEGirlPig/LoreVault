import { describe, expect, it, vi, afterEach } from "vitest";
import { mapOwnedGames, parseSteamId, steamLoginUrl, verifySteamAssertion } from "@/lib/integrations/steam";

afterEach(() => vi.unstubAllGlobals());
const RT = "https://vaultheim.gg/api/connections/steam/callback";
const assertion = (over: Record<string, string> = {}) => new URLSearchParams({
  "openid.mode": "id_res", "openid.return_to": `${RT}?state=abc`, "openid.op_endpoint": "https://steamcommunity.com/openid/login",
  "openid.claimed_id": "https://steamcommunity.com/openid/id/76561197960435530", ...over,
});

describe("steam", () => {
  it("builds an OpenID login URL", () => expect(steamLoginUrl(RT, "https://vaultheim.gg")).toContain("openid.mode=checkid_setup"));
  it("parses only genuine Steam claimed ids", () => {
    expect(parseSteamId("https://steamcommunity.com/openid/id/76561197960435530")).toBe("76561197960435530");
    expect(parseSteamId("https://evil.example/openid/id/76561197960435530")).toBeNull();
    expect(parseSteamId("https://steamcommunity.com/openid/id/123")).toBeNull();
  });
  it("accepts an assertion Steam confirms", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n")));
    expect(await verifySteamAssertion(assertion(), RT)).toBe("76561197960435530");
  });
  it("rejects when Steam says invalid", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("is_valid:false")));
    expect(await verifySteamAssertion(assertion(), RT)).toBeNull();
  });
  it("rejects a foreign return_to without calling Steam", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    expect(await verifySteamAssertion(assertion({ "openid.return_to": "https://evil.example/cb" }), RT)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("maps owned games, keeping playtime only when supplied", () => {
    const g = mapOwnedGames({ response: { games: [{ appid: 10, name: "Game A", playtime_forever: 90 }, { appid: 20 }] } });
    expect(g[0]).toMatchObject({ externalId: "10", title: "Game A", playtimeMinutes: 90 });
    expect(g[1].playtimeMinutes).toBeUndefined();
  });
});

import { mergeAchievements } from "@/lib/integrations/steam";
describe("mergeAchievements", () => {
  const schema = { game: { availableGameStats: { achievements: [
    { name: "A1", displayName: "First", description: "Do it", icon: "i1", icongray: "g1", hidden: 0 },
    { name: "A2", displayName: "Secret", description: "Shh", icon: "i2", icongray: "g2", hidden: 1 },
  ] } } };
  const player = { playerstats: { success: true, achievements: [{ apiname: "A1", achieved: 1, unlocktime: 1700000000 }, { apiname: "A2", achieved: 0, unlocktime: 0 }] } };
  const global = { achievementpercentages: { achievements: [{ name: "A1", percent: "54.32" }, { name: "A2", percent: 3.1 }] } };
  it("merges schema, progress and rarity", () => {
    const r = mergeAchievements(schema, player, global);
    expect(r[0]).toMatchObject({ id: "A1", name: "First", unlocked: true, unlockedAt: 1700000000, globalPercent: 54.3 });
    expect(r[1]).toMatchObject({ hidden: true, unlocked: false, unlockedAt: null, globalPercent: 3.1 });
  });
  it("handles games without achievements", () => expect(mergeAchievements({ game: {} }, null, null)).toEqual([]));
});
