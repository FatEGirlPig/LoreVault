import { describe, expect, it } from "vitest";
import { computeBadges } from "@/lib/badges";
const base = { achievements: 0, perfect: 0, games: 0, minutes: 0, rarest: null, friends: 0, clips: 0 };
describe("computeBadges", () => {
  it("starts with nothing earned", () => expect(computeBadges(base).filter((b) => b.earned)).toHaveLength(0));
  it("awards tiers and rarity", () => {
    const b = Object.fromEntries(computeBadges({ ...base, achievements: 150, perfect: 1, rarest: 0.8 }).map((x) => [x.id, x]));
    expect(b.century.earned && b.perfect1.earned && b.rare.earned && b.legend.earned).toBe(true);
    expect(b.thousand).toMatchObject({ earned: false, progress: "150/1,000" });
  });
});
