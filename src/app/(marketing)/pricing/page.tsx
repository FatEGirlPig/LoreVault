import Link from "next/link";
import { ADDONS, DOWNGRADE_GRACE_DAYS, PLANS, formatBytes, type PlanId } from "@/lib/plans";
export const metadata = { title: "Pricing" };

export default function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="h1 text-center">Free library. Pay only for more storage.</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-mute">Game library entries and metadata never count toward your storage.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          return (
            <div key={id} className={`card flex flex-col ${id === "pro" ? "border-violet" : ""}`}>
              <h2 className="font-display font-bold">{p.name}</h2>
              <p className="mt-2 text-3xl font-bold">{formatBytes(p.bytes)}</p>
              <p className="mt-1 text-sm text-mute">{p.monthly ? `$${p.monthly}/month or $${p.annual}/year` : "Free forever"}</p>
              <ul className="mt-4 flex-1 space-y-1 text-sm text-mute">
                <li>▸ Unlimited library entries</li><li>▸ Platform connections</li><li>▸ {formatBytes(p.bytes)} private Vault</li>
                {id !== "free" && <li>▸ Storage add-ons available</li>}
              </ul>
              <Link href={id === "free" ? "/signup" : "/billing"} className={`mt-6 ${id === "pro" ? "btn-primary" : "btn-ghost"}`}>{id === "free" ? "Get started" : `Choose ${p.name}`}</Link>
            </div>
          );
        })}
      </div>
      <h2 className="mt-12 font-display text-lg font-bold">Storage add-ons</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {Object.values(ADDONS).map((a) => <div key={a.name} className="card"><p className="font-semibold">{a.name}</p><p className="text-sm text-mute">${a.monthly}/month</p></div>)}
      </div>
      <div className="card mt-12 text-sm text-mute">
        <h2 className="mb-2 font-semibold text-ink">Fair downgrade policy</h2>
        If you downgrade or a payment fails and you&apos;re over your new limit, your account and library stay fully available. New uploads pause,
        and you get {DOWNGRADE_GRACE_DAYS} days to export or remove files. We never delete files just because a payment failed.
      </div>
    </div>
  );
}
