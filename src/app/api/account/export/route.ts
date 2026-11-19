import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const tables = ["profiles", "privacy_settings", "user_games", "collections", "connected_accounts", "clips", "user_achievements", "friendships", "game_sync_jobs"];
  const col: Record<string, string> = { profiles: "id", friendships: "requester_id" };
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), email: user.email };
  for (const t of tables) out[t] = (await supabase.from(t).select("*").eq(col[t] ?? "user_id", user.id)).data;
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="vaultheim-export.json"' },
  });
}
