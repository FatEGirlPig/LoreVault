import "server-only";
import { adminClient } from "@/lib/supabase/server";

export type NotificationKind = "friend_request" | "friend_accepted" | "reaction" | "comment" | "lfg_join" | "price_drop" | "group_join";

/** Create in-app notifications (never to yourself). */
export async function notify(userId: string, kind: NotificationKind, payload: Record<string, unknown>, actorId?: string) {
  if (actorId && actorId === userId) return;
  await adminClient().from("notifications").insert({ user_id: userId, kind, payload: { ...payload, actorId } });
}
