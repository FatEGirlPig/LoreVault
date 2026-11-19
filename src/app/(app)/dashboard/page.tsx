import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { Empty, PLATFORM_LABEL, StorageMeter } from "@/components/ui";
import { capacityOf } from "@/lib/storage/quota";
import { PLANS, type PlanId } from "@/lib/plans";
export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count }, { data: recent }, { data: accounts }, { data: quota }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("user_games").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_games").select("id, platform, games(title)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("connected_accounts").select("platform, status, last_synced_at, last_error").eq("user_id", user.id),
    supabase.from("storage_quotas").select("*").eq("user_id", user.id).single(),
    supabase.from("storage_usage").select("used_bytes").eq("user_id", user.id).single(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="h1">Command deck</h1>
      {!profile?.username && (
        <div className="card border-violet"><p className="font-semibold">Pick a username to finish setting up</p>
          <p className="mt-1 text-sm text-mute">Your profile stays private until you choose otherwise.</p>
          <Link href="/settings" className="btn-primary mt-3">Set username</Link></div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="label">Games</p><p className="text-3xl font-bold">{count ?? 0}</p></div>
        <div className="card"><p className="label">Connected platforms</p><p className="text-3xl font-bold">{accounts?.length ?? 0}</p></div>
        <div className="card"><p className="label">Storage · {PLANS[(quota?.plan ?? "free") as PlanId].name}</p>
          {quota && usage && <StorageMeter used={Number(usage.used_bytes)} capacity={capacityOf(quota)} />}
          {quota?.grace_until && <p className="mt-2 text-xs text-amber-300">Over limit: uploads paused. Free space or upgrade before {new Date(quota.grace_until).toLocaleDateString()}.</p>}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Recently added</h2><Link href="/library" className="text-sm text-cyan">Library →</Link></div>
          {recent?.length ? <ul className="card divide-y divide-line p-0">{recent.map((g) => (
            <li key={g.id}><Link href={`/library/${g.id}`} className="flex justify-between px-5 py-3 text-sm hover:bg-navy">
              <span>{(g.games as unknown as { title: string }).title}</span><span className="text-mute">{PLATFORM_LABEL[g.platform]}</span></Link></li>))}</ul>
            : <Empty title="No games yet"><Link href="/connections" className="text-cyan">Connect Steam</Link> or <Link href="/library" className="text-cyan">add a game</Link>.</Empty>}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Sync status</h2><Link href="/connections" className="text-sm text-cyan">Manage →</Link></div>
          {accounts?.length ? <ul className="card divide-y divide-line p-0">{accounts.map((a) => (
            <li key={a.platform} className="flex justify-between px-5 py-3 text-sm"><span>{PLATFORM_LABEL[a.platform]}</span>
              <span className={a.status === "error" ? "text-red-300" : "text-mute"}>
                {a.status === "error" ? "Sync error" : a.last_synced_at ? `Synced ${new Date(a.last_synced_at).toLocaleString()}` : "Not yet synced"}</span></li>))}</ul>
            : <Empty title="Steam not connected"><Link href="/connections" className="text-cyan">Connect Steam</Link> to import your games and achievements.</Empty>}
        </section>
      </div>
    </div>
  );
}
