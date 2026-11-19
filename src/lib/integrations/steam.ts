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

const key = () => process.env.STEAM_WEB_API_KEY!;

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
  dataTypes: ["identity", "library", "playtime"],
  caveat: "Owned games are only visible when your Steam profile's game details are public.",
  async getAccountProfile(steamId) {
    const r = await fetch(`${API}/ISteamUser/GetPlayerSummaries/v2/?key=${key()}&steamids=${steamId}`);
    const p = (await r.json())?.response?.players?.[0];
    return { externalUserId: steamId, displayName: p?.personaname, avatarUrl: p?.avatarfull };
  },
  async fetchLibrary(steamId) {
    const r = await fetch(`${API}/IPlayerService/GetOwnedGames/v1/?key=${key()}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`);
    if (r.status === 429) throw new Error("Steam rate limit reached. Try again shortly.");
    if (!r.ok) throw new Error(`Steam API error (${r.status}).`);
    const json = await r.json();
    if (!json?.response?.games)
      throw new Error("Steam returned no games. Set Game details to Public in your Steam privacy settings, then sync again.");
    return { games: mapOwnedGames(json), dataTypes: ["library", "playtime"] };
  },
};
