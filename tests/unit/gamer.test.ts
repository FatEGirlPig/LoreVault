import { describe, expect, it } from "vitest";
import { computeStreak, levelFromXp, personality, weekStart, weeklyChallenges } from "@/lib/gamer";

const D = 86400, monday = weekStart(20410 * D);
describe("gamer", () => {
  it("levels", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, needed: 100 });
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(650)).toMatchObject({ level: 4, into: 50, needed: 400 });
  });
  it("streaks", () => {
    const u = (d: number) => ({ unlockedAt: d * D + 100, globalPercent: 50 });
    expect(computeStreak([u(1), u(2), u(3), u(10), u(11)], 11 * D + 500)).toEqual({ current: 2, best: 3, activeToday: true });
    expect(computeStreak([u(1), u(2)], 5 * D).current).toBe(0);
  });
  it("week starts on Monday", () => expect(new Date(weekStart(monday + 3 * D + 50) * 1000).getUTCDay()).toBe(1));
  it("challenges track this week only", () => {
    const now = monday + 2 * D;
    const c = weeklyChallenges([{ unlockedAt: monday + 10, globalPercent: 3 }, { unlockedAt: monday - 10, globalPercent: 3 }], now);
    expect(c).toHaveLength(3);
    expect(c.every((x) => x.progress <= 1)).toBe(true);
  });
  it("personality", () => expect(personality({ genres: { RPG: 9, Action: 2 }, completionRate: 0.7, perfect: 1, games: 50, rareShare: 0 }).title).toBe("Completionist Lore Seeker"));
});
