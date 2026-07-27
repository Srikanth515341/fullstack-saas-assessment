# Phase 4 — Break & Modify

## 1. New `displayName` column on `users`

- Added `displayName: varchar('display_name', { length: 100 })` to `lib/db/schema.ts`.
- Generated migration: `pnpm db:generate` → `lib/db/migrations/0001_steady_scream.sql`:
  ```sql
  ALTER TABLE "users" ADD COLUMN "display_name" varchar(100);
  ```
- Applied with `pnpm db:migrate`; verified via `\d users` in psql — column present.
- Wired end-to-end: `updateAccountSchema`/`updateAccount` action (`app/(login)/actions.ts`) now accepts and persists `displayName`; the General Settings form (`app/(dashboard)/dashboard/general/page.tsx`) has a new input, pre-filled from `/api/user` via SWR, and saved back through the same action.

This step also satisfies task 5 (frontend + action + schema touched in one change).

## 2. New protected page: `/dashboard/notes`

- Added `app/(dashboard)/dashboard/notes/page.tsx` and a sidebar entry in `app/(dashboard)/dashboard/layout.tsx`.
- No auth code was added to the page itself — protection is automatic because `middleware.ts` matches on `pathname.startsWith('/dashboard')` for *any* route underneath, not per-page.
- **To verify yourself**: sign out, then visit `http://localhost:3000/dashboard/notes` directly — you should be redirected to `/sign-in`. This is worth actually doing once, since it's the whole point of the exercise.

## 3. Pricing plans changed

- `app/(dashboard)/pricing/page.tsx`: added a bullet to each plan's feature list (`'Task Management'` on Base, `'Advanced Analytics'` on Plus).
- Note from Phase 2/3 mapping still applies here: plan **names/prices** come live from Stripe (`getStripeProducts`/`getStripePrices`, matched by product name `'Base'`/`'Plus'`) — only the feature bullets are hardcoded in this file, so that's what a code change to "the plans" can reliably affect regardless of what's in your Stripe test account.

## 4. Intentional break → real error → fix

- **Break**: deleted `import { redirect } from 'next/navigation';` from `lib/auth/middleware.ts` (used inside `withTeam`, which the checkout/portal actions depend on).
- **Error captured** (via `npx tsc --noEmit`):
  ```
  lib/auth/middleware.ts(64,7): error TS2304: Cannot find name 'redirect'.
  ```
- **Fix**: re-added the import. Re-ran `npx tsc --noEmit` → clean, exit code 0.
- This is the artifact for the pass criterion "fixed at least one error using only the error message" — `TS2304: Cannot find name` directly names the missing identifier and its file/line, which is what pointed straight at the fix.

## Verification run
- `npx tsc --noEmit` — clean.
- `pnpm build` — compiled successfully, all routes generated including `/dashboard/notes`.

## What's still on you
- The pass criterion "your new field survives a fresh clone + migrate" means the migration file must be **committed** — it is, as part of this branch, so a teammate cloning fresh and running `pnpm db:migrate` gets `display_name` too. Worth actually testing this once if you want full confidence (e.g. a second local DB + fresh clone).
- Actually sign out and hit `/dashboard/notes` yourself to see the middleware redirect happen live — that's a 10-second check that turns "I read that it works" into "I saw it work."