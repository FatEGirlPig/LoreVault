export type Stats = { achievements: number; perfect: number; games: number; minutes: number; rarest: number | null; friends: number; clips: number };
export type Badge = { id: string; icon: string; name: string; desc: string; earned: boolean; progress?: string };

/** LoreVault badges, computed from stats (no storage needed). */
export function computeBadges(s: Stats): Badge[] {
  const tier = (id: string, icon: string, name: string, desc: string, have: number, need: number): Badge =>
    ({ id, icon, name, desc, earned: have >= need, progress: have >= need ? undefined : `${Math.min(have, need).toLocaleString()}/${need.toLocaleString()}` });
  return [
    tier("first", "✨", "First Steps", "Unlock your first achievement", s.achievements, 1),
    tier("century", "💯", "Centurion", "Unlock 100 achievements", s.achievements, 100),
    tier("thousand", "🌟", "Thousand Club", "Unlock 1,000 achievements", s.achievements, 1000),
    tier("perfect1", "🏆", "Perfectionist", "100% a game", s.perfect, 1),
    tier("perfect10", "👑", "Completionist", "100% ten games", s.perfect, 10),
    { id: "rare", icon: "💎", name: "Rare Hunter", desc: "Unlock an achievement fewer than 5% of players have", earned: s.rarest != null && s.rarest < 5 },
    { id: "legend", icon: "🔥", name: "Legendary", desc: "Unlock an achievement fewer than 1% of players have", earned: s.rarest != null && s.rarest < 1 },
    tier("collector", "📚", "Collector", "Own 100 games", s.games, 100),
    tier("hoarder", "🗄️", "Hoarder", "Own 500 games", s.games, 500),
    tier("veteran", "⏱️", "Veteran", "Play 1,000 hours", Math.floor(s.minutes / 60), 1000),
    tier("social", "👥", "Squad Up", "Add 5 friends", s.friends, 5),
    tier("clipper", "🎬", "Highlight Reel", "Share your first clip", s.clips, 1),
  ];
}
