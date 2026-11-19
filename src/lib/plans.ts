export const GB = 1024 ** 3;

export type PlanId = "free" | "plus" | "pro" | "ultimate";
export type Interval = "month" | "year";

export const PLANS: Record<PlanId, { name: string; bytes: number; monthly: number; annual: number }> = {
  free: { name: "Free", bytes: 10 * GB, monthly: 0, annual: 0 },
  plus: { name: "Plus", bytes: 50 * GB, monthly: 2.99, annual: 29.99 },
  pro: { name: "Pro", bytes: 250 * GB, monthly: 5.99, annual: 59.99 },
  ultimate: { name: "Ultimate", bytes: 1024 * GB, monthly: 11.99, annual: 119.99 },
};

export type AddonId = "addon_25" | "addon_100" | "addon_500";
export const ADDONS: Record<AddonId, { name: string; bytes: number; monthly: number }> = {
  addon_25: { name: "Extra 25 GB", bytes: 25 * GB, monthly: 1.49 },
  addon_100: { name: "Extra 100 GB", bytes: 100 * GB, monthly: 3.99 },
  addon_500: { name: "Extra 500 GB", bytes: 500 * GB, monthly: 9.99 },
};

/** Days a user keeps read/export access after a downgrade leaves them over quota. */
export const DOWNGRADE_GRACE_DAYS = 30;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}
