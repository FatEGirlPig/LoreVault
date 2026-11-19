import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { deleteGroup, toggleGroupMembership } from "@/app/actions";
import { ConfirmButton, Submit } from "@/components/forms";

type Row = { user_id: string; username: string | null; achievements: number; perfect: number; minutes: number };

export default async function Group({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await getUser();
  const { data: g } = await supabase.from("groups").select("*, group_members(user_id, role)").eq("slug", slug).single();
  if (!g) notFound();
  const members = g.group_members as { user_id: string; role: string }[];
  const me = members.find((m) => m.user_id === user?.id);
  const { data } = await supabase.rpc("group_leaderboard", { gid: g.id });
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, achievements: Number(r.achievements), perfect: Number(r.perfect), minutes: Number(r.minutes) }))
    .sort((a, b) => b.achievements - a.achievements);
  const total = rows.reduce((t, r) => ({ a: t.a + r.achievements, p: t.p + r.perfect, m: t.m + r.minutes }), { a: 0, p: 0, m: 0 });

  return (
    <div className="space-y-6">
      <Link href="/groups" className="text-sm text-mute hover:text-ink">← All groups</Link>
      <div className="card flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="h1">{g.name}</h1>{g.description && <p className="mt-2 max-w-2xl text-sm">{g.description}</p>}
          <p className="mt-2 text-xs text-mute">{members.length} members</p></div>
        {!user ? <Link href="/signup" className="btn-primary">Sign up to join</Link> : me?.role === "owner"
          ? <form action={deleteGroup}><input type="hidden" name="id" value={g.id} /><ConfirmButton message="Delete this group for everyone?">Delete group</ConfirmButton></form>
          : <form action={toggleGroupMembership}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="slug" value={slug} />
              <Submit className={me ? "btn-ghost" : "btn-primary"}>{me ? "Leave group" : "Join group"}</Submit></form>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="card"><p className="label">Achievements</p><p className="glow-text font-display text-2xl font-bold">{total.a.toLocaleString()}</p></div>
        <div className="card"><p className="label">Perfect games</p><p className="glow-text font-display text-2xl font-bold">{total.p}</p></div>
        <div className="card"><p className="label">Hours</p><p className="glow-text font-display text-2xl font-bold">{Math.round(total.m / 60).toLocaleString()}</p></div>
      </div>
      <section><h2 className="mb-3 font-display font-bold">Member leaderboard</h2>
        <ol className="card divide-y divide-line p-0">{rows.map((r, i) => (
          <li key={r.user_id} className={`flex items-center gap-4 px-5 py-3 text-sm ${r.user_id === user?.id ? "bg-violet/10" : ""}`}>
            <span className="w-8 text-center font-display">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
            <Link href={`/profile/${r.username}`} className="min-w-0 flex-1 truncate font-semibold hover:text-cyan">{r.username}</Link>
            <span className="text-mute">{r.perfect} 🏆</span><span className="glow-text font-display font-bold">{r.achievements.toLocaleString()}</span>
          </li>))}</ol>
        <p className="mt-2 text-xs text-mute">Members with a private library aren&apos;t ranked.</p>
      </section>
    </div>
  );
}
