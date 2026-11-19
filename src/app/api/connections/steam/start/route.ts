import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getUser } from "@/lib/supabase/server";
import { steamLoginUrl } from "@/lib/integrations/steam";

export async function GET() {
  const { user } = await getUser();
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  if (!user) return NextResponse.redirect(`${site}/login`);
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(steamLoginUrl(`${site}/api/connections/steam/callback?state=${state}`, site));
  res.cookies.set("steam_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/connections/steam" });
  return res;
}
