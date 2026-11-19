import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/server";

export type Clip = {
  id: string; user_id: string; provider: string; video_id: string; url: string; title: string | null;
  visibility: string; created_at: string; game_title: string | null; username: string | null;
};
const COLS = "id, user_id, provider, video_id, url, title, visibility, created_at, games(title)";

async function decorate(rows: Record<string, unknown>[]): Promise<Clip[]> {
  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: names } = ids.length ? await adminClient().from("profiles").select("id, username").in("id", ids) : { data: [] };
  return rows.map((r) => ({
    ...(r as unknown as Clip),
    game_title: (r.games as { title: string } | null)?.title ?? null,
    username: names?.find((n) => n.id === r.user_id)?.username ?? null,
  }));
}

/** Viewer's client is used, so RLS enforces each clip's visibility. */
export async function listClips(supabase: SupabaseClient, userId: string, tab: "mine" | "friends" | "public", ownerId?: string) {
  let q = supabase.from("clips").select(COLS).order("created_at", { ascending: false }).limit(48);
  if (ownerId) q = q.eq("user_id", ownerId);
  else if (tab === "mine") q = q.eq("user_id", userId);
  else if (tab === "public") q = q.eq("visibility", "public");
  else {
    const { data: f } = await supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted");
    const friends = (f ?? []).map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
    if (!friends.length) return [];
    q = q.in("user_id", friends).neq("visibility", "private");
  }
  const { data } = await q;
  return decorate(data ?? []);
}

export async function getClip(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.from("clips").select(COLS).eq("id", id).maybeSingle();
  return data ? (await decorate([data]))[0] : null;
}
