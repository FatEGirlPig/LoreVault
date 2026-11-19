import { describe, expect, it } from "vitest";
import { checkUpload, capacityOf, sanitizeFilename } from "@/lib/storage/quota";
import { GB, PLANS } from "@/lib/plans";

const base = { filename: "shot.png", contentType: "image/png", sizeBytes: 5_000_000, usedBytes: 0, pendingBytes: 0, capacityBytes: 10 * GB, overQuotaGrace: false };

describe("checkUpload", () => {
  it("free plan is 10 GB", () => expect(PLANS.free.bytes).toBe(10 * GB));
  it("accepts a valid screenshot", () => expect(checkUpload(base)).toEqual({ ok: true, category: "screenshot" }));
  it("rejects when quota would be exceeded", () => expect(checkUpload({ ...base, usedBytes: 10 * GB - 1000 }).ok).toBe(false));
  it("counts pending uploads against quota", () => expect(checkUpload({ ...base, pendingBytes: 10 * GB }).ok).toBe(false));
  it("allows exactly filling the quota", () => expect(checkUpload({ ...base, usedBytes: 10 * GB - 5_000_000 }).ok).toBe(true));
  it("pauses uploads during a downgrade grace period", () => expect(checkUpload({ ...base, overQuotaGrace: true }).ok).toBe(false));
  it("pauses uploads when already over capacity", () => expect(checkUpload({ ...base, usedBytes: 11 * GB }).ok).toBe(false));
  it("rejects unsupported types", () => expect(checkUpload({ ...base, contentType: "application/x-msdownload", filename: "a.exe" }).ok).toBe(false));
  it("rejects mismatched extensions", () => expect(checkUpload({ ...base, filename: "shot.exe" }).ok).toBe(false));
  it("rejects zero, negative and non-integer sizes", () => {
    for (const sizeBytes of [0, -1, 1.5, NaN]) expect(checkUpload({ ...base, sizeBytes }).ok).toBe(false);
  });
  it("rejects files over 2 GB", () => expect(checkUpload({ ...base, sizeBytes: 3 * GB, capacityBytes: 100 * GB }).ok).toBe(false));
  it("capacity includes add-ons", () => expect(capacityOf({ base_bytes: 10 * GB, addon_bytes: 25 * GB })).toBe(35 * GB));
  it("sanitizes filenames", () => expect(sanitizeFilename("../../etc/pa ss<wd>.png")).toBe(".._.._etc_pa ss_wd_.png"));
});
