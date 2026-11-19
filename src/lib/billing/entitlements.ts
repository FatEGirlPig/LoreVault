import { ADDONS, DOWNGRADE_GRACE_DAYS, PLANS, type AddonId, type PlanId } from "@/lib/plans";

const ACTIVE = new Set(["active", "trialing", "past_due"]); // past_due keeps access while Stripe retries

/** Compute the storage entitlement from a subscription's state and items. Pure for testing. */
export function computeEntitlement(input: {
  status: string; plan: PlanId | null; addons: AddonId[]; usedBytes: number; now?: Date; currentGraceUntil?: string | null;
}) {
  const active = ACTIVE.has(input.status);
  const plan: PlanId = active && input.plan ? input.plan : "free";
  const addonBytes = active ? input.addons.reduce((t, a) => t + ADDONS[a].bytes, 0) : 0;
  const capacity = PLANS[plan].bytes + addonBytes;
  const now = input.now ?? new Date();
  let graceUntil: string | null = null;
  if (input.usedBytes > capacity) {
    graceUntil = input.currentGraceUntil ?? new Date(now.getTime() + DOWNGRADE_GRACE_DAYS * 864e5).toISOString();
  }
  return { plan, baseBytes: PLANS[plan].bytes, addonBytes, capacity, graceUntil };
}
