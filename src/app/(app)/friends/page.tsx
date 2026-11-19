import Link from "next/link";
import { adminClient, requireUser } from "@/lib/supabase/server";
import { blockUser, reportUser, respondFriend, sendFriendRequest, unblockUser } from "@/app/actions";
import { ActionForm, ConfirmButton, Submit } from "@/components/forms";
import { Empty } from "@/components/ui";
export const metadata = { title: "Friends" };

export default async function Friends() {
  const { supabase, user } = await requireUser();
  const [{ data: rows }, { data: blocks }] = await Promise.all([
    supabase.from("friendships").select("*").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
  ]);
  // Usernames of people you have a relationship with (minimal fields, server-side only).
  const ids = [...new Set([...(rows ?? []).flatMap((r) => [r.requester_id, r.addressee_id]), ...(blocks ?? []).map((b) => b.blocked_id)])].filter((x) => x !== user.id);
  const { data: names } = ids.length ? await adminClient().from("profiles").select("id, username").in("id", ids) : { data: [] };
  const name = (id: string) => names?.find((n) => n.id === id)?.username ?? "unknown";
  const other = (r: { requester_id: string; addressee_id: string }) => (r.requester_id === user.id ? r.addressee_id : r.requester_id);

  const friends = rows?.filter((r) => r.status === "accepted") ?? [];
  const incoming = rows?.filter((r) => r.status === "pending" && r.addressee_id === user.id) ?? [];
  const outgoing = rows?.filter((r) => r.status === "pending" && r.requester_id === user.id) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="h1">Friends</h1>
      <div className="card"><ActionForm action={sendFriendRequest} className="flex flex-wrap gap-3">
        <input name="username" required placeholder="Username" className="input max-w-xs" aria-label="Username" />
        <Submit>Send request</Submit></ActionForm></div>
      {incoming.length > 0 && <section><h2 className="mb-2 font-display font-bold">Requests</h2>
        <ul className="card divide-y divide-line p-0">{incoming.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>@{name(r.requester_id)}</span>
            <form action={respondFriend} className="flex gap-2"><input type="hidden" name="id" value={r.id} />
              <button name="action" value="accept" className="btn-primary">Accept</button>
              <button name="action" value="reject" className="btn-ghost">Decline</button></form></li>))}</ul></section>}
      <section><h2 className="mb-2 font-display font-bold">Friends</h2>
        {friends.length ? <ul className="card divide-y divide-line p-0">{friends.map((r) => {
          const id = other(r);
          return <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
            <Link href={`/profile/${name(id)}`} className="hover:text-cyan">@{name(id)}</Link>
            <div className="flex gap-2">
              <form action={respondFriend}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="action" value="remove" />
                <ConfirmButton message="Remove friend?" className="btn-ghost">Remove</ConfirmButton></form>
              <form action={blockUser}><input type="hidden" name="user_id" value={id} /><ConfirmButton message="Block this user?">Block</ConfirmButton></form>
            </div>
            <details className="w-full text-xs"><summary className="cursor-pointer text-mute">Report</summary>
              <ActionForm action={reportUser} className="mt-2 flex gap-2"><input type="hidden" name="user_id" value={id} />
                <input name="reason" placeholder="What happened?" className="input" /><Submit className="btn-ghost">Send</Submit></ActionForm></details>
          </li>;
        })}</ul> : <Empty title="No friends yet">Send a request by username.</Empty>}</section>
      {outgoing.length > 0 && <section><h2 className="mb-2 font-display font-bold">Sent</h2>
        <ul className="card divide-y divide-line p-0">{outgoing.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>@{name(r.addressee_id)} · pending</span>
            <form action={respondFriend}><input type="hidden" name="id" value={r.id} /><button name="action" value="cancel" className="btn-ghost">Cancel</button></form></li>))}</ul></section>}
      {!!blocks?.length && <section><h2 className="mb-2 font-display font-bold">Blocked</h2>
        <ul className="card divide-y divide-line p-0">{blocks.map((b) => (
          <li key={b.blocked_id} className="flex items-center justify-between px-5 py-3 text-sm"><span>@{name(b.blocked_id)}</span>
            <form action={unblockUser}><input type="hidden" name="user_id" value={b.blocked_id} /><button className="btn-ghost">Unblock</button></form></li>))}</ul></section>}
    </div>
  );
}
