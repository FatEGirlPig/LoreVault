import { requireUser } from "@/lib/supabase/server";
import { addStorageAddon, openBillingPortal, startCheckout } from "@/app/actions";
import { Submit } from "@/components/forms";
import { Notice, StorageMeter } from "@/components/ui";
import { capacityOf } from "@/lib/storage/quota";
import { ADDONS, PLANS, formatBytes, type AddonId, type PlanId } from "@/lib/plans";
export const metadata = { title: "Billing" };

export default async function Billing({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: sub }, { data: quota }, { data: usage }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", user.id).single(),
    supabase.from("storage_quotas").select("*").eq("user_id", user.id).single(),
    supabase.from("storage_usage").select("used_bytes").eq("user_id", user.id).single(),
  ]);
  const current = (quota?.plan ?? "free") as PlanId;
  const paid = sub?.stripe_subscription_id && sub.status !== "canceled";
  const message = sp.success === "addon" ? "Add-on requested. Your storage updates once payment is confirmed."
    : sp.success ? "Thanks! Your plan updates once payment is confirmed." : undefined;

  return (
    <div className="space-y-6">
      <h1 className="h1">Billing</h1>
      <Notice params={{ ...sp, message }} />
      <div className="card grid gap-4 sm:grid-cols-2">
        <div><p className="label">Current plan</p><p className="text-2xl font-bold">{PLANS[current].name}</p>
          {sub?.status && sub.status !== "none" && <p className="text-sm text-mute">Status: {sub.status}{sub.cancel_at_period_end ? " · cancels at period end" : ""}
            {sub.current_period_end ? ` · renews ${new Date(sub.current_period_end).toLocaleDateString()}` : ""}</p>}
          {sub?.status === "past_due" && <p className="mt-1 text-sm text-amber-300">Payment failed. Update your payment method; your files are safe.</p>}</div>
        <div>{quota && usage && <StorageMeter used={Number(usage.used_bytes)} capacity={capacityOf(quota)} />}
          {Number(quota?.addon_bytes) > 0 && <p className="mt-2 text-xs text-mute">Includes {formatBytes(Number(quota!.addon_bytes))} of add-ons</p>}</div>
        {sub?.stripe_customer_id && <form action={openBillingPortal}><Submit className="btn-ghost">Manage payment, invoices & cancellation</Submit></form>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          return (
            <div key={id} className={`card flex flex-col ${id === current ? "border-cyan" : ""}`}>
              <h2 className="font-display font-bold">{p.name}</h2>
              <p className="text-2xl font-bold">{formatBytes(p.bytes)}</p>
              <p className="flex-1 text-sm text-mute">{p.monthly ? `$${p.monthly}/mo · $${p.annual}/yr` : "Free forever"}</p>
              {id === current ? <span className="badge mt-4 justify-center border-cyan text-cyan">Current</span>
                : id === "free" ? <p className="mt-4 text-xs text-mute">Cancel from “Manage” to return to Free.</p>
                : <div className="mt-4 flex flex-col gap-2">
                  {(["month", "year"] as const).map((interval) => (
                    <form key={interval} action={startCheckout}><input type="hidden" name="plan" value={id} /><input type="hidden" name="interval" value={interval} />
                      <Submit className={`${interval === "year" ? "btn-primary" : "btn-ghost"} w-full`}>{interval === "month" ? "Monthly" : "Annual"}</Submit></form>))}
                </div>}
            </div>);
        })}
      </div>

      <section><h2 className="mb-3 font-display font-bold">Storage add-ons</h2>
        {paid ? <div className="grid gap-3 sm:grid-cols-3">{(Object.keys(ADDONS) as AddonId[]).map((a) => (
          <form key={a} action={addStorageAddon} className="card flex items-center justify-between"><input type="hidden" name="addon" value={a} />
            <div><p className="font-semibold">{ADDONS[a].name}</p><p className="text-sm text-mute">${ADDONS[a].monthly}/month</p></div>
            <Submit className="btn-ghost">Add</Submit></form>))}</div>
          : <p className="text-sm text-mute">Add-ons are available with any paid plan.</p>}
      </section>
      <p className="text-xs text-mute">Downgrading never deletes files. If you&apos;re over your new limit, uploads pause and you have 30 days to export or remove files.</p>
    </div>
  );
}
