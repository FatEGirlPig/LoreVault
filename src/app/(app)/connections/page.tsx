import { requireUser } from "@/lib/supabase/server";
import { disconnectAccount, syncConnection } from "@/app/actions";
import { ConfirmButton, Submit } from "@/components/forms";
import { Notice } from "@/components/ui";
import { CONNECTORS } from "@/lib/integrations";
export const metadata = { title: "Connections" };

export default async function Connections({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: accounts }, { data: jobs }] = await Promise.all([
    supabase.from("connected_accounts").select("*").eq("user_id", user.id),
    supabase.from("game_sync_jobs").select("*, connected_accounts(platform)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const message = sp.imported ? `Sync complete: ${sp.imported} games imported.` : undefined;

  return (
    <div className="space-y-6">
      <h1 className="h1">Connections</h1>
      <p className="text-sm text-mute">Link your Steam account with Steam&apos;s official sign-in to import your games, playtime and achievements. We never see your Steam password. Games from other platforms can be added from your Library.</p>
      <Notice params={{ ...sp, message }} />
      <div className="grid gap-4 md:grid-cols-2">
        {CONNECTORS.map((c) => {
          const acc = accounts?.find((a) => a.platform === c.platform);
          return (
            <div key={c.platform} className="card space-y-3">
              <div className="flex items-center justify-between"><h2 className="font-display font-bold">{c.name}</h2>
                <span className={`badge ${acc?.status === "error" ? "border-red-500 text-red-300" : acc ? "border-cyan text-cyan" : ""}`}>
                  {acc ? (acc.status === "error" ? "Error" : "Connected") : c.status === "available" ? "Not connected" : "Planned"}</span></div>
              <p className="text-xs text-mute">{c.caveat}</p>
              {acc ? (<>
                <dl className="grid grid-cols-2 gap-1 text-sm">
                  <dt className="text-mute">Account</dt><dd>{acc.display_name ?? acc.external_user_id}</dd>
                  <dt className="text-mute">Data available</dt><dd>{acc.available_data.join(", ") || "identity"}</dd>
                  <dt className="text-mute">Last sync</dt><dd>{acc.last_synced_at ? new Date(acc.last_synced_at).toLocaleString() : "Never"}</dd>
                </dl>
                {acc.last_error && <p role="alert" className="text-sm text-red-300">{acc.last_error}</p>}
                <div className="flex flex-wrap gap-2">
                  <form action={syncConnection}><input type="hidden" name="id" value={acc.id} /><Submit className="btn-ghost">Sync now</Submit></form>
                  <form action={disconnectAccount} className="flex items-center gap-2"><input type="hidden" name="id" value={acc.id} />
                    <label className="text-xs text-mute"><input type="checkbox" name="remove_games" className="mr-1" />Also remove synced games</label>
                    <ConfirmButton message={`Disconnect ${c.name}?`}>Disconnect</ConfirmButton></form>
                </div></>
              ) : c.status === "available" ? (
                <a href={`/api/connections/${c.platform}/start`} className="btn-primary">Connect {c.name}</a>
              ) : <p className="text-sm text-mute">Not available yet — add these games manually from your Library.</p>}
            </div>
          );
        })}
      </div>
      <section><h2 className="mb-3 font-display font-bold">Sync history</h2>
        {jobs?.length ? <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
          <thead className="text-mute"><tr><th className="p-3">Platform</th><th className="p-3">Status</th><th className="p-3">Games</th><th className="p-3">When</th></tr></thead>
          <tbody>{jobs.map((j) => (<tr key={j.id} className="border-t border-line">
            <td className="p-3">{(j.connected_accounts as { platform: string } | null)?.platform ?? "—"}</td>
            <td className={`p-3 ${j.status === "failed" ? "text-red-300" : ""}`} title={j.error ?? ""}>{j.status}{j.attempt > 1 ? ` (attempt ${j.attempt})` : ""}</td>
            <td className="p-3">{j.games_imported}</td><td className="p-3 text-mute">{new Date(j.created_at).toLocaleString()}</td></tr>))}</tbody>
        </table></div> : <p className="text-sm text-mute">No syncs yet.</p>}
      </section>
    </div>
  );
}
