import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { createGroup } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Empty } from "@/components/ui";
export const metadata = { title: "Groups" };

export default async function Groups({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  let q = supabase.from("groups").select("id, slug, name, description, group_members(count)").order("created_at", { ascending: false }).limit(60);
  if (sp.q) q = q.ilike("name", `%${sp.q.replace(/[%_]/g, "")}%`);
  const [{ data: groups }, { data: mine }] = await Promise.all([q, user ? supabase.from("group_members").select("group_id").eq("user_id", user.id) : Promise.resolve({ data: [] })]);
  const myIds = new Set((mine ?? []).map((m) => m.group_id));

  return (
    <div className="space-y-6">
      <h1 className="h1">Groups &amp; Clans</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <form className="card flex gap-2 lg:col-span-2" role="search">
          <input name="q" defaultValue={sp.q} placeholder="Search groups…" className="input" aria-label="Search groups" /><button className="btn-ghost">Search</button>
        </form>
        {user && <details className="card"><summary className="cursor-pointer font-display font-bold">+ Create a group</summary>
          <ActionForm action={createGroup} className="mt-3 space-y-3">
            <input name="name" required maxLength={50} placeholder="Group name" className="input" aria-label="Name" />
            <input name="slug" maxLength={32} placeholder="link-name (optional)" className="input" aria-label="Link" />
            <textarea name="description" maxLength={500} rows={2} placeholder="What's your group about?" className="input" />
            <Submit>Create</Submit>
          </ActionForm></details>}
      </div>
      {groups?.length ? <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{groups.map((g) => (
        <li key={g.id}><Link href={`/groups/${g.slug}`} className="card block h-full transition hover:border-violet">
          <div className="flex items-start justify-between gap-2"><p className="font-display font-bold">{g.name}</p>
            {myIds.has(g.id) && <span className="badge border-cyan text-cyan">Member</span>}</div>
          <p className="mt-1 line-clamp-2 text-sm text-mute">{g.description ?? "No description yet."}</p>
          <p className="mt-2 text-xs text-mute">{(g.group_members as unknown as { count: number }[])[0]?.count ?? 0} members</p>
        </Link></li>))}</ul>
        : <Empty title={sp.q ? "No groups match" : "No groups yet"}>Start one for your squad, Discord or clan.</Empty>}
    </div>
  );
}
