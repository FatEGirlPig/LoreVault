import Link from "next/link";
import { adminClient, requireUser } from "@/lib/supabase/server";
import { markNotificationsRead } from "@/app/actions";
import { Submit } from "@/components/forms";
import { Empty } from "@/components/ui";
export const metadata = { title: "Notifications" };

type P = Record<string, string | number | null | undefined>;
const money = (c: unknown, cur: unknown) => typeof c === "number" ? `${(c / 100).toFixed(2)} ${cur ?? ""}`.trim() : "";

export default async function Notifications() {
  const { supabase, user } = await requireUser();
  const { data: items } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
  const actors = [...new Set((items ?? []).map((n) => (n.payload as P).actorId).filter(Boolean))] as string[];
  const { data: names } = actors.length ? await adminClient().from("profiles").select("id, username").in("id", actors) : { data: [] };
  const who = (id: unknown) => names?.find((n) => n.id === id)?.username ?? "Someone";

  const render = (kind: string, p: P): [React.ReactNode, string] => {
    const u = <b>{who(p.actorId)}</b>;
    switch (kind) {
      case "friend_request": return [<>{u} sent you a friend request</>, "/friends"];
      case "friend_accepted": return [<>{u} accepted your friend request</>, `/profile/${who(p.actorId)}`];
      case "reaction": return [<>{u} reacted {p.emoji} to {p.label ? <b>{p.label}</b> : `your ${p.type}`}</>, p.type === "clip" ? `/clip/${p.id}` : "/dashboard"];
      case "comment": return [<>{u} commented on {p.label ? <b>{p.label}</b> : `your ${p.type}`}: “{p.body}”</>, p.type === "clip" ? `/clip/${p.id}` : "/dashboard"];
      case "lfg_join": return [<>{u} joined your <b>{p.game}</b> group</>, "/lfg"];
      case "group_join": return [<>{u} joined <b>{p.group}</b></>, `/groups/${p.slug}`];
      case "price_drop": return [<>💸 <b>{p.game}</b> on your wishlist dropped to {money(p.to, p.currency)} ({p.discount}% off)</>, "/discover"];
      default: return [<>New notification</>, "/dashboard"];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h1">Notifications</h1>
        {items?.some((n) => !n.read_at) && <form action={markNotificationsRead}><Submit className="btn-ghost">Mark all read</Submit></form>}
      </div>
      {items?.length ? (
        <ul className="card divide-y divide-line p-0">{items.map((n) => {
          const [text, href] = render(n.kind, n.payload as P);
          return <li key={n.id}><Link href={href} className={`flex items-center gap-3 px-5 py-3 text-sm hover:bg-navy ${n.read_at ? "text-mute" : ""}`}>
            {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-cyan" aria-label="Unread" />}
            <span className="min-w-0 flex-1">{text}</span>
            <time className="shrink-0 text-xs text-mute">{new Date(n.created_at).toLocaleDateString()}</time></Link></li>;
        })}</ul>
      ) : <Empty title="You're all caught up">Friend requests, reactions, comments and wishlist price drops show up here.</Empty>}
    </div>
  );
}
