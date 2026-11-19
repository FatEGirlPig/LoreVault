import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/server";

export type SocialData = { reactions: Record<string, { count: number; mine: boolean }>; comments: { id: string; user_id: string; username: string | null; body: string; created_at: string }[] };

/** Reactions + comments for many targets in two queries (RLS decides what's visible). */
export async function loadSocial(db: SupabaseClient, viewer: string, type: "clip" | "activity", ids: string[]) {
  const out = new Map<string, SocialData>(ids.map((id) => [id, { reactions: {}, comments: [] }]));
  if (!ids.length) return out;
  const [{ data: rs }, { data: cs }] = await Promise.all([
    db.from("reactions").select("target_id, user_id, emoji").eq("target_type", type).in("target_id", ids),
    db.from("comments").select("id, target_id, user_id, body, created_at").eq("target_type", type).in("target_id", ids).order("created_at").limit(500),
  ]);
  for (const r of rs ?? []) {
    const t = out.get(r.target_id)!.reactions;
    t[r.emoji] ??= { count: 0, mine: false }; t[r.emoji].count++; if (r.user_id === viewer) t[r.emoji].mine = true;
  }
  const uids = [...new Set((cs ?? []).map((c) => c.user_id))];
  const { data: names } = uids.length ? await adminClient().from("profiles").select("id, username").in("id", uids) : { data: [] };
  for (const c of cs ?? []) out.get(c.target_id)!.comments.push({ ...c, username: names?.find((n) => n.id === c.user_id)?.username ?? null });
  return out;
}
