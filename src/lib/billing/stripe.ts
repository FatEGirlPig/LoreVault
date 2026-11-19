import "server-only";
import Stripe from "stripe";
import type { AddonId, Interval, PlanId } from "@/lib/plans";

let s: Stripe | null = null;
export const stripe = () => (s ??= new Stripe(process.env.STRIPE_SECRET_KEY!));

const env = (k: string) => process.env[k] ?? "";
export const planPrice = (plan: Exclude<PlanId, "free">, interval: Interval) =>
  env(`STRIPE_PRICE_${plan.toUpperCase()}_${interval === "month" ? "MONTHLY" : "ANNUAL"}`);
export const addonPrice = (addon: AddonId) => env(`STRIPE_PRICE_${addon.toUpperCase()}`);

/** Reverse lookup from a Stripe price ID to our plan/add-on. */
export function lookupPrice(priceId: string):
  | { kind: "plan"; plan: Exclude<PlanId, "free">; interval: Interval }
  | { kind: "addon"; addon: AddonId } | null {
  for (const plan of ["plus", "pro", "ultimate"] as const)
    for (const interval of ["month", "year"] as const)
      if (planPrice(plan, interval) === priceId) return { kind: "plan", plan, interval };
  for (const addon of ["addon_25", "addon_100", "addon_500"] as const)
    if (addonPrice(addon) === priceId) return { kind: "addon", addon };
  return null;
}
