import "server-only";
import { adminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Clip } from "@/components/clip-card";

const COLS = "id, title, filename, visibility, created_at, owner_id, games(title)";

/** Attach usernames (only username, nothing private) and game titles to clip rows. */
async function decorate(rows: Record<string, unknown>[]): Promise<Clip[]> {
  const ids = [...new Set(rows.map((r) => r.owner_id as string))];
  const { data: names } = ids.length ? await adminClient().from("profiles").select("id, username").in("id", ids) : { data: [] };
  return rows.map((r) => ({
    ...(r as unknown as Clip),
    game_title: (r.games as { title: string } | null)?.title ?? null,
    username: names?.find((n) => n.id === r.owner_id)?.username ?? null,
  }));
}

// All queries use the viewer's client, so RLS enforces visibility.
export async function listClips(supabase: SupabaseClient, userId: string | null, tab: "mine" | "friends" | "public") {
  let q = supabase.from("media_files").select(COLS).eq("category", "video").eq("status", "ready").order("created_at", { ascending: false }).limit(48);
  if (tab === "mine") q = q.eq("owner_id", userId!);
  else if (tab === "public") q = q.eq("visibility", "public");
  else {
    const { data: f } = await supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted");
    const friends = (f ?? []).map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
    if (!friends.length) return [];
    q = q.in("owner_id", friends).in("visibility", ["friends", "public"]);
  }
  const { data } = await q;
  return decorate(data ?? []);
}

export async function getClip(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.from("media_files").select(COLS).eq("id", id).eq("category", "video").eq("status", "ready").maybeSingle();
  return data ? (await decorate([data]))[0] : null;
}
