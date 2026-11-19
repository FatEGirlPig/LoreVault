import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminClient } from "@/lib/supabase/server";
import { lookupPrice, stripe } from "@/lib/billing/stripe";
import { computeEntitlement } from "@/lib/billing/entitlements";
import type { AddonId, PlanId } from "@/lib/plans";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type.startsWith("customer.subscription.")) {
    await applySubscription(event.data.object as Stripe.Subscription, event.type === "customer.subscription.deleted");
  }
  return NextResponse.json({ received: true });
}

async function applySubscription(sub: Stripe.Subscription, deleted: boolean) {
  const db = adminClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data: row } = await db.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).single();
  if (!row) return;
  const userId = row.user_id;

  let plan: PlanId | null = null, interval: string | null = null;
  const addons: { addon: AddonId; itemId: string }[] = [];
  for (const item of sub.items.data) {
    const p = lookupPrice(item.price.id);
    if (p?.kind === "plan") { plan = p.plan; interval = p.interval; }
    if (p?.kind === "addon") for (let i = 0; i < (item.quantity ?? 1); i++) addons.push({ addon: p.addon, itemId: item.id });
  }
  const status = deleted ? "canceled" : sub.status;
  const periodEnd = sub.items.data[0]?.current_period_end;

  const [{ data: usage }, { data: quota }] = await Promise.all([
    db.from("storage_usage").select("used_bytes").eq("user_id", userId).single(),
    db.from("storage_quotas").select("grace_until").eq("user_id", userId).single(),
  ]);
  const ent = computeEntitlement({
    status, plan, addons: addons.map((a) => a.addon), usedBytes: Number(usage?.used_bytes ?? 0),
    currentGraceUntil: quota?.grace_until,
  });

  await db.from("subscriptions").update({
    stripe_subscription_id: sub.id, plan: ent.plan, interval, status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end, updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  await db.from("storage_quotas").update({
    plan: ent.plan, base_bytes: ent.baseBytes, addon_bytes: ent.addonBytes, grace_until: ent.graceUntil,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  await db.from("storage_addons").delete().eq("user_id", userId);
  if (ent.addonBytes > 0) {
    const { ADDONS } = await import("@/lib/plans");
    const unique = [...new Map(addons.map((a) => [a.itemId, a])).values()];
    await db.from("storage_addons").insert(unique.map((a) => ({
      user_id: userId, stripe_subscription_item_id: a.itemId, bytes: ADDONS[a.addon].bytes * addons.filter((x) => x.itemId === a.itemId).length,
    })));
  }
  await db.from("audit_logs").insert({ user_id: userId, action: "billing.updated", detail: { plan: ent.plan, status } });
}
