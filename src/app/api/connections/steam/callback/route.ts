import { NextResponse, type NextRequest } from "next/server";
import { adminClient, audit, getUser } from "@/lib/supabase/server";
import { steam, verifySteamAssertion } from "@/lib/integrations/steam";
import { syncAccount } from "@/lib/integrations/sync";
import { prefetchAchievements } from "@/lib/integrations/achievements";
import { after } from "next/server";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const back = (msg: string) => NextResponse.redirect(`${site}/connections?${msg}`);
  const { user } = await getUser();
  if (!user) return NextResponse.redirect(`${site}/login`);

  const params = req.nextUrl.searchParams;
  const state = params.get("state");
  if (!state || state !== req.cookies.get("steam_state")?.value) return back("error=Invalid+or+expired+request");

  const steamId = await verifySteamAssertion(params, `${site}/api/connections/steam/callback`);
  if (!steamId) return back("error=Steam+could+not+verify+the+sign-in");

  const db = adminClient();
  const profile = await steam.getAccountProfile!(steamId).catch(() => ({ externalUserId: steamId, displayName: undefined }));
  const { data: account, error } = await db.from("connected_accounts").upsert({
    user_id: user.id, platform: "steam", external_user_id: steamId, display_name: profile.displayName ?? null,
    status: "connected", granted_permissions: ["openid_identity"], available_data: ["identity"],
  }, { onConflict: "user_id,platform" }).select().single();
  if (error) {
    console.error("steam connect failed", error);
    return back(error.code === "23505"
      ? "error=This+Steam+account+is+already+linked+to+another+LoreVault+user"
      : "error=Could+not+save+the+Steam+connection.+Please+try+again");
  }
  await audit(user.id, "connection.added", { platform: "steam" });

  let msg = "connected=steam";
  try {
    const r = await syncAccount(user.id, account.id); msg += `&imported=${r.imported}`;
    after(() => prefetchAchievements(user.id, { limit: 150 }).catch(() => {}));
  }
  catch (e) { msg += `&error=${encodeURIComponent(e instanceof Error ? e.message : "Sync failed")}`; }
  const res = back(msg);
  res.cookies.delete({ name: "steam_state", path: "/api/connections/steam" });
  return res;
}
