import { describe, expect, it } from "vitest";
import { computeEntitlement } from "@/lib/billing/entitlements";
import { GB } from "@/lib/plans";

const now = new Date("2026-01-01T00:00:00Z");

describe("computeEntitlement", () => {
  it("active pro plan with add-on", () => {
    const e = computeEntitlement({ status: "active", plan: "pro", addons: ["addon_25"], usedBytes: 0, now });
    expect(e.capacity).toBe(275 * GB);
    expect(e.graceUntil).toBeNull();
  });
  it("canceled subscription falls back to free and drops add-ons", () => {
    const e = computeEntitlement({ status: "canceled", plan: "pro", addons: ["addon_100"], usedBytes: 0, now });
    expect(e.plan).toBe("free");
    expect(e.capacity).toBe(10 * GB);
  });
  it("past_due keeps access while Stripe retries (no surprise loss)", () => {
    expect(computeEntitlement({ status: "past_due", plan: "plus", addons: [], usedBytes: 0, now }).plan).toBe("plus");
  });
  it("downgrade over quota starts a 30-day grace period, files untouched", () => {
    const e = computeEntitlement({ status: "canceled", plan: null, addons: [], usedBytes: 40 * GB, now });
    expect(e.graceUntil).toBe("2026-01-31T00:00:00.000Z");
  });
  it("keeps an existing grace deadline instead of extending it", () => {
    const e = computeEntitlement({ status: "canceled", plan: null, addons: [], usedBytes: 40 * GB, now, currentGraceUntil: "2026-01-10T00:00:00.000Z" });
    expect(e.graceUntil).toBe("2026-01-10T00:00:00.000Z");
  });
});
