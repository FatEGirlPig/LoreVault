/** Pure gamer-progress logic: XP/levels, streaks, weekly challenges, personality. No I/O, fully testable. */

export type Unlock = { unlockedAt: number | null; globalPercent: number | null };

// ---------- XP & levels ----------
export function computeXp(s: { achievements: number; perfect: number; clips: number; friends: number; challenges: number; rareUnlocks: number }) {
  return s.achievements * 10 + s.perfect * 250 + s.rareUnlocks * 40 + s.clips * 25 + s.friends * 20 + s.challenges * 150;
}
/** Level n needs 100·n·(n+1)/2 XP total: 100, 300, 600, 1000… */
export function levelFromXp(xp: number) {
  let level = 0;
  while (100 * ((level + 1) * (level + 2)) / 2 <= xp) level++;
  const floor = (100 * level * (level + 1)) / 2, next = (100 * (level + 1) * (level + 2)) / 2;
  return { level: level + 1, xp, into: xp - floor, needed: next - floor, pct: Math.round(((xp - floor) / (next - floor)) * 100) };
}

// ---------- Streaks (UTC days with ≥1 unlock) ----------
const day = (t: number) => Math.floor(t / 86400);
export function computeStreak(unlocks: Unlock[], now = Date.now() / 1000) {
  const days = [...new Set(unlocks.filter((u) => u.unlockedAt).map((u) => day(u.unlockedAt!)))].sort((a, b) => a - b);
  let best = 0, run = 0, prev = -2;
  for (const d of days) { run = d === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  const today = day(now), last = days.at(-1);
  const current = last !== undefined && today - last <= 1 ? run : 0;   // alive if you unlocked today or yesterday
  return { current, best, activeToday: last === today };
}

// ---------- Weekly challenges (rotate deterministically each ISO-ish week, Monday 00:00 UTC) ----------
export type Challenge = { id: string; title: string; goal: number; progress: number; done: boolean };
const POOL = [
  { id: "unlock10", title: "Unlock 10 achievements", goal: 10, measure: (w: Unlock[]) => w.length },
  { id: "unlock25", title: "Unlock 25 achievements", goal: 25, measure: (w: Unlock[]) => w.length },
  { id: "rare5", title: "Unlock an achievement rarer than 5%", goal: 1, measure: (w: Unlock[]) => w.filter((u) => (u.globalPercent ?? 100) < 5).length },
  { id: "rare20x3", title: "Unlock 3 achievements rarer than 20%", goal: 3, measure: (w: Unlock[]) => w.filter((u) => (u.globalPercent ?? 100) < 20).length },
  { id: "days4", title: "Unlock achievements on 4 different days", goal: 4, measure: (w: Unlock[]) => new Set(w.map((u) => day(u.unlockedAt!))).size },
  { id: "days7", title: "Unlock something every day this week", goal: 7, measure: (w: Unlock[]) => new Set(w.map((u) => day(u.unlockedAt!))).size },
];
export const weekStart = (t: number) => { const d = day(t); return (d - ((d + 3) % 7)) * 86400; }; // Monday (1970-01-01 was a Thursday)
export function weeklyChallenges(unlocks: Unlock[], now = Date.now() / 1000): Challenge[] {
  const start = weekStart(now), week = Math.floor(start / (7 * 86400));
  const inWeek = unlocks.filter((u) => u.unlockedAt && u.unlockedAt >= start && u.unlockedAt < start + 7 * 86400);
  const picks = [POOL[week % 2], POOL[2 + (week % 2)], POOL[4 + (week % 2)]];
  return picks.map((c) => { const progress = Math.min(c.goal, c.measure(inWeek)); return { id: c.id, title: c.title, goal: c.goal, progress, done: progress >= c.goal }; });
}
/** Challenges completed over the last `weeks` weeks (for XP). */
export function completedChallenges(unlocks: Unlock[], weeks = 12, now = Date.now() / 1000) {
  let n = 0;
  for (let i = 0; i < weeks; i++) n += weeklyChallenges(unlocks, now - i * 7 * 86400).filter((c) => c.done).length;
  return n;
}

// ---------- Gamer personality ----------
export function personality(s: { genres: Record<string, number>; completionRate: number; perfect: number; games: number; rareShare: number }) {
  const top = Object.entries(s.genres).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  const style = s.perfect >= 5 || s.completionRate >= 0.6 ? "Completionist" : s.rareShare >= 0.15 ? "Trophy Hunter" : s.games >= 300 ? "Collector" : s.completionRate < 0.2 ? "Sampler" : "Adventurer";
  const GENRE: Record<string, string> = { Action: "Action Hero", RPG: "Lore Seeker", Strategy: "Tactician", Simulation: "Builder", Adventure: "Explorer", Indie: "Indie Spirit", Casual: "Chill Gamer", Racing: "Speed Demon", Sports: "Athlete", "Massively Multiplayer": "Raider" };
  const flavor = GENRE[top[0]] ?? "Wanderer";
  const blurb: Record<string, string> = {
    Completionist: "You don't stop until every achievement is yours.",
    "Trophy Hunter": "You chase the achievements most players never see.",
    Collector: "Your library is a museum, and you're proud of it.",
    Sampler: "You love trying a bit of everything.",
    Adventurer: "You play for the journey, finishing what grabs you.",
  };
  return { title: `${style} ${flavor}`, blurb: blurb[style], topGenres: top.slice(0, 3) };
}
