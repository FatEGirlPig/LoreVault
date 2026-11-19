import type { Connector, ImportedGame } from "./types";

const OPENID = "https://steamcommunity.com/openid/login";
const API = "https://api.steampowered.com";

export function steamLoginUrl(returnTo: string, realm: string): string {
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${OPENID}?${p}`;
}

/** Extract SteamID64 from a claimed_id. Returns null if the URL is not a Steam identity. */
export function parseSteamId(claimedId: string | null): string | null {
  const m = claimedId?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  return m ? m[1] : null;
}

/** Verify an OpenID assertion directly with Steam (check_authentication). */
export async function verifySteamAssertion(params: URLSearchParams, expectedReturnTo: string): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") return null;
  const returnTo = params.get("openid.return_to") ?? "";
  if (!returnTo.startsWith(expectedReturnTo)) return null;
  if (params.get("openid.op_endpoint") !== OPENID) return null;
  const body = new URLSearchParams(params);
  body.set("openid.mode", "check_authentication");
  const res = await fetch(OPENID, { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  const text = await res.text();
  if (!/is_valid\s*:\s*true/.test(text)) return null;
  return parseSteamId(params.get("openid.claimed_id"));
}

const key = () => encodeURIComponent((process.env.STEAM_WEB_API_KEY ?? "").trim());

export function mapOwnedGames(json: unknown): ImportedGame[] {
  const games = (json as { response?: { games?: { appid: number; name?: string; playtime_forever?: number }[] } })
    ?.response?.games ?? [];
  return games.map((g) => ({
    externalId: String(g.appid),
    title: g.name || `Steam app ${g.appid}`,
    coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
    playtimeMinutes: typeof g.playtime_forever === "number" ? g.playtime_forever : undefined,
  }));
}

export const steam: Connector = {
  platform: "steam",
  name: "Steam",
  status: "available",
  dataTypes: ["identity", "library", "playtime", "achievements"],
  caveat: "Owned games are only visible when your Steam profile's game details are public.",
  async getAccountProfile(steamId) {
    const r = await fetch(`${API}/ISteamUser/GetPlayerSummaries/v2/?key=${key()}&steamids=${steamId}`);
    const p = (await r.json())?.response?.players?.[0];
    return { externalUserId: steamId, displayName: p?.personaname, avatarUrl: p?.avatarfull };
  },
  async fetchLibrary(steamId) {
    const r = await fetch(`${API}/IPlayerService/GetOwnedGames/v1/?key=${key()}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`);
    if (r.status === 429) throw new Error("Steam rate limit reached. Try again shortly.");
    if (r.status === 401 || r.status === 403) throw new Error("Steam rejected the site's API key. The site owner needs to check STEAM_WEB_API_KEY.");
    if (!r.ok) throw new Error(`Steam API error (${r.status}).`);
    const json = await r.json();
    if (!json?.response?.games)
      throw new Error("Steam returned no games. Set Game details to Public in your Steam privacy settings, then sync again.");
    return { games: mapOwnedGames(json), dataTypes: ["library", "playtime"] };
  },
};

export interface Achievement {
  id: string; name: string; description: string; icon: string; iconGray: string;
  hidden: boolean; unlocked: boolean; unlockedAt: number | null; globalPercent: number | null;
}

/** Merge schema, player progress and global rarity into one list. Pure for testing. */
export function mergeAchievements(schema: unknown, player: unknown, global: unknown): Achievement[] {
  type S = { name: string; displayName?: string; description?: string; icon?: string; icongray?: string; hidden?: number };
  const defs = ((schema as { game?: { availableGameStats?: { achievements?: S[] } } })?.game?.availableGameStats?.achievements) ?? [];
  const mine = new Map(((player as { playerstats?: { achievements?: { apiname: string; achieved: number; unlocktime: number }[] } })
    ?.playerstats?.achievements ?? []).map((a) => [a.apiname, a]));
  const pct = new Map(((global as { achievementpercentages?: { achievements?: { name: string; percent: number | string }[] } })
    ?.achievementpercentages?.achievements ?? []).map((a) => [a.name, Number(a.percent)]));
  return defs.map((d) => {
    const m = mine.get(d.name);
    return {
      id: d.name, name: d.displayName || d.name, description: d.description ?? "", icon: d.icon ?? "", iconGray: d.icongray ?? d.icon ?? "",
      hidden: d.hidden === 1, unlocked: m?.achieved === 1, unlockedAt: m?.achieved === 1 && m.unlocktime ? m.unlocktime : null,
      globalPercent: pct.has(d.name) ? Math.round(pct.get(d.name)! * 10) / 10 : null,
    };
  });
}

/** Fetch a user's achievements for one Steam app. Returns [] for games without achievements. */
export async function fetchSteamAchievements(steamId: string, appId: string): Promise<Achievement[]> {
  const [schemaRes, playerRes, globalRes] = await Promise.all([
    fetch(`${API}/ISteamUserStats/GetSchemaForGame/v2/?key=${key()}&appid=${appId}&l=english`),
    fetch(`${API}/ISteamUserStats/GetPlayerAchievements/v1/?key=${key()}&steamid=${steamId}&appid=${appId}`),
    fetch(`${API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`),
  ]);
  if (schemaRes.status === 401 || schemaRes.status === 403) throw new Error("Steam rejected the site's API key.");
  const schema = schemaRes.ok ? await schemaRes.json() : null;
  const player = await playerRes.json().catch(() => null);
  if (playerRes.status === 403 || player?.playerstats?.error?.includes?.("private"))
    throw new Error("Your Steam game details are private. Set Game details to Public in Steam's privacy settings to show achievements.");
  const global = globalRes.ok ? await globalRes.json() : null;
  return mergeAchievements(schema, player, global);
}
