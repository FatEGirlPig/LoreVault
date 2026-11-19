import { ImageResponse } from "next/og";
import { adminClient } from "@/lib/supabase/server";
import { loadStats } from "@/lib/stats";

/** Shareable stats card (PNG). Only for profiles whose owner made both the profile and library public. */
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = adminClient();
  const { data: p } = await db.from("profiles").select("id, username, display_name, visibility").eq("username", username.toLowerCase()).single();
  const { data: priv } = p ? await db.from("privacy_settings").select("library").eq("user_id", p.id).single() : { data: null };
  if (!p || p.visibility !== "public" || priv?.library !== "public") return new Response("Not found", { status: 404 });

  const { stats, rarest, badges, rows } = await loadStats(db, p.id);
  const earned = badges.filter((b) => b.earned).slice(0, 6);
  const tiles = [
    ["Games", stats.games.toLocaleString()], ["Hours", Math.round(stats.minutes / 60).toLocaleString()],
    ["Achievements", stats.achievements.toLocaleString()], ["Perfect games", String(stats.perfect)],
  ];
  const top = rows.filter((r) => r.unlocked === r.total).slice(0, 1)[0]?.user_games.games.title;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 56, color: "#e6e9f5",
        background: "radial-gradient(900px 500px at 85% 0%, #2a1d6e 0%, #05060d 60%)", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, fontWeight: 800 }}>{p.display_name || p.username}</div>
            <div style={{ fontSize: 28, color: "#8d95b5" }}>@{p.username}</div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, display: "flex" }}>VAULT<span style={{ color: "#22d3ee" }}>HEIM</span></div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 48 }}>
          {tiles.map(([l, v]) => (
            <div key={l} style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, borderRadius: 24, border: "2px solid #1f2847", background: "rgba(16,22,46,.85)" }}>
              <div style={{ fontSize: 22, color: "#8d95b5", textTransform: "uppercase", letterSpacing: 2 }}>{l}</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: "#a78bfa" }}>{v}</div>
            </div>))}
        </div>
        <div style={{ display: "flex", marginTop: 32, gap: 24, fontSize: 26, color: "#8d95b5" }}>
          {rarest[0] && <div style={{ display: "flex" }}>💎 Rarest: <span style={{ color: "#e6e9f5", marginLeft: 10 }}>{rarest[0].name} ({rarest[0].globalPercent}%)</span></div>}
          {top && <div style={{ display: "flex" }}>🏆 <span style={{ color: "#e6e9f5", marginLeft: 10 }}>{top}</span></div>}
        </div>
        <div style={{ display: "flex", marginTop: "auto", gap: 14, fontSize: 40 }}>{earned.map((b) => <div key={b.id}>{b.icon}</div>)}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } },
  );
}
