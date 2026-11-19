# LoreVault

*Your entire gaming universe. One place.* A free-first gaming library and personal archive.

Built from the LoreVault Product & Development Plan v1.0 with Next.js 16, TypeScript, Tailwind v4, Supabase (Auth + Postgres + RLS), Cloudflare R2, Stripe Billing and the Steam Web API.

## What's included (MVP)

| Area | Status |
|---|---|
| Public site: `/`, `/features`, `/pricing` | ✅ |
| Auth: signup, email verification, login, logout, password reset | ✅ Supabase Auth, rate-limited |
| Protected app shell + dashboard (games, sync status, storage) | ✅ |
| Library: search, filter, sort, manual add, CSV import, detail page, notes/rating/status | ✅ |
| Steam: OpenID connect (state-checked, verified with Steam), owned-games sync, retries, sync history, disconnect | ✅ |
| Other platforms | Listed as **Planned** with honest caveats (no sync promised) |
| Vault: private R2 uploads via signed URLs, progress, categories, download, delete, visibility | ✅ |
| 10 GB free quota, enforced server-side (counts pending uploads; verifies object size/type after upload) | ✅ |
| Collections & wishlists: create, rename, reorder, add/remove games, visibility | ✅ |
| Social: public profile, friend requests, block, report | ✅ |
| Privacy: everything private by default, per-resource visibility, data export, account deletion | ✅ |
| Billing: Plus/Pro/Ultimate monthly & annual, add-ons, Stripe portal, verified webhooks, 30-day grace on downgrade (no auto-deletion) | ✅ |
| Database: 20 tables, RLS on all, server-only tables for quotas/subscriptions/tokens, audit log | ✅ `supabase/migrations/0001_init.sql` |
| Tests: quota rules, billing entitlements/downgrade, Steam assertion verification, token encryption | ✅ `npm test` |

## Setup

1. `npm install`
2. Create a Supabase project and run `supabase/migrations/0001_init.sql` (SQL editor or `supabase db push`).
   In Auth → URL configuration, add `<SITE_URL>/auth/callback` as a redirect URL.
3. Create a private Cloudflare R2 bucket. Add a CORS rule allowing `PUT` from your site origin with the `Content-Type` header.
4. Get a Steam Web API key: https://steamcommunity.com/dev/apikey
5. In Stripe, create the products and prices (see `/pricing`), enable the Customer Portal, and add a webhook to
   `<SITE_URL>/api/stripe/webhook` for `customer.subscription.created|updated|deleted`.
6. `cp .env.example .env.local` and fill everything in. Generate `TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`.
7. `npm run dev`

Deploy to Vercel with the same environment variables.

## Architecture notes

- **Security model:** all user reads go through the Supabase anon client, so RLS decides access. The service-role client (`adminClient`) is only used server-side after the user has been verified, for writes the user must not control (quotas, media insert, sync results, billing).
- **Integrations:** `src/lib/integrations` has a common `Connector` interface. Add a platform by implementing `fetchLibrary` and setting `status: "available"`. Syncs are idempotent (they upsert on unique keys).
- **Quota flow:** `POST /api/vault/upload` validates and reserves space → browser PUTs to R2 → `POST /api/vault/complete` HEADs the object to check size and type → a DB trigger recalculates usage.
- **Billing:** entitlements change **only** in the verified Stripe webhook (`computeEntitlement`). `past_due` keeps access. Going over quota sets `grace_until` and pauses uploads; files are never deleted automatically.

## Before beta (from plan §12–14, not done here)

- Malware scanning on upload (hook marked `TODO` in `api/vault/complete`)
- Move sync to a queue/cron worker (it currently runs inline with retries); add a shared rate limiter (Redis) instead of the in-memory one
- IGDB (or another licensed provider) for artwork and metadata; review Steam branding and artwork terms
- RLS integration tests against a local Supabase (`supabase start`)
- Privacy policy, terms, monitoring, backups, and registering the LoreVault.net domain
