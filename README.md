# LoreVault

*Your entire gaming universe. One place.* A free Steam library, achievement tracker and clip-sharing site.

Next.js 16 · TypeScript · Tailwind v4 · Supabase (Auth + Postgres + RLS) · Steam Web API · Vercel.

## Features
- **Steam sign-in** (OpenID, verified with Steam): imports owned games and playtime; idempotent sync with retries and history.
- **Achievements**: per-game lists (rarity, unlock dates, hidden achievements) and a Trophy Room with totals, perfect games, recent and rarest unlocks. Fetched in the background after each sync and cached for 6 hours.
- **Library**: search, filter, sort, manual entries and CSV import for non-Steam games, notes, ratings, collections.
- **Clips**: share YouTube, Twitch or Streamable links (no file storage), with friends and public feeds and shareable pages.
- **Social and privacy**: friends, blocking, reporting, private-by-default visibility enforced by Postgres RLS, data export, account deletion.
- **Sound**: synthesized UI sounds and a chiptune music loop, with per-device volume and mute.

## Setup
1. `npm install`
2. Run `supabase/migrations/*.sql` in order on your Supabase project. Add `<SITE_URL>/auth/callback` to the Auth redirect URLs.
3. `cp .env.example .env.local` and set the Supabase URL, anon key, service-role key, `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`), `STEAM_WEB_API_KEY` and `NEXT_PUBLIC_SITE_URL`.
4. `npm run dev` · `npm test`
