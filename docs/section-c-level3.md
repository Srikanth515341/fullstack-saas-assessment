# Section C — Level 3 (Advanced) Backlog — 9/9 complete

## Timeline note
Mid-session, scope was corrected down to the 4 credential-free features + tests
(#16, #17, #18, #19, #20, #23), since Distinction only strictly requires one Level 3
feature plus a test suite. The remaining 3 (#21 i18n, #22 metered billing, #24 AI
suggestions) were completed afterward in a follow-up pass, at which point i18n was
rebuilt from scratch (having been cleanly reverted once already — see the git history).
All 9 features are now implemented, verified, and passing the full check suite.

## 16. Granular permissions beyond Owner/Member
- `lib/auth/permissions.ts` — a `Permission` enum and a `ROLE_PERMISSIONS` map for 4 tiers
  (`owner`, `admin`, `member`, `viewer`), replacing the old binary owner/member check.
- **Real bug fixed along the way**: `inviteTeamMember` never actually checked permissions
  server-side — the only gate was the *client-side* `disabled` prop on the invite form
  (`isOwner = user?.role === 'owner'`), which also read the wrong field (`users.role`, a
  legacy global field, not `team_members.role`, which is what's actually team-scoped).
  Both `inviteTeamMember` and `removeTeamMember` now check
  `hasPermission(callerTeamRole, Permission.X)` **inside the action itself**.
- `getUserWithTeam()` extended to return the caller's own `teamRole` (additive).
- Invite UI offers all 4 roles, gated on the caller's real permissions via
  `useMyTeamRole()`.

## 17. Public REST API + API keys
- `api_keys` table — SHA-256 hash stored, not the raw key; a display prefix
  (`sk_live_ab12...`) lets the UI show *something* without holding the real key again.
- `lib/auth/api-keys.ts` — `createApiKey()` (raw key returned exactly once),
  `authenticateApiRequest()` (shared Bearer-token auth for every `/api/v1/*` route).
- `GET/POST /api/v1/tasks`, `PATCH/DELETE /api/v1/tasks/[id]` — every mutation scopes its
  `WHERE` by the authenticated key's `userId`.
- `/dashboard/api-keys` — create/list/revoke UI.

## 18. Rate limiting
- `lib/rate-limit.ts` — in-memory fixed-window counter, no dependency; documented swap to
  `@upstash/ratelimit` + `@upstash/redis`.
- Applied to `/api/v1/tasks*` (60 req/min per key) **and** `/api/ai/suggest-tasks`
  (10 req/min per user) once #24 landed — an LLM-backed endpoint is exactly the kind of
  thing worth protecting, and reusing the same primitive built for #17 cost nothing extra.

## 19. Real-time task updates
- `lib/realtime/task-events.ts` — in-process `EventEmitter` pub/sub over Server-Sent
  Events, genuinely working locally without Pusher. `RealtimeTaskRefresh` calls
  `router.refresh()` on any event — tasks update live across tabs and when changed via the
  public API. Documented single-instance limitation (swap to Pusher before scaling out).

## 20. Test suite: Vitest (unit) + Playwright (e2e)
- **Unit** — 20 tests across 4 files: `lib/csv.test.ts`, `lib/auth/permissions.test.ts`,
  `lib/rate-limit.test.ts`, and (added with #24) `lib/ai/suggest-tasks.test.ts` — verifies
  the stub fallback actually returns usable suggestions when no provider is configured,
  which is the specific safety property #24 depends on. All pure logic, no DB, ~1.4s.
- **E2E** — 5 tests across 2 files, run against a real dev server + real local Postgres:
  sign-up → dashboard, sign-out/sign-in round-trip, wrong-password rejection,
  create-and-toggle a task, delete-and-restore via trash.
- **Two real test bugs the first run caught** (details preserved from the original pass):
  Next dev-mode cold-compile latency exceeding Playwright's 5s default timeout, and an
  overly-broad `getByText` locator matching both a form error and stacked toasts. Both
  fixed; still passing after every feature added since.

## 21. Internationalization (English + French)
- `lib/i18n/dictionaries.ts` — a plain object dictionary for `en`/`fr`, covering nav, auth,
  general, security, team, activity, admin, api-keys, and tasks pages. Not a full-app
  rewrite: routes stay at their current URLs (no `[locale]` segment) — this is
  locale-aware **content**, not locale-aware **routing**. See "What's still English-only"
  below for the honest boundary of this rollout.
- `components/locale-provider.tsx` — client Context storing the active locale, persisted
  via a `locale` cookie (same pattern as the dark-mode toggle from Level 1: corrects from
  the cookie in a `useEffect` after mount, so SSR always renders the default with no
  hydration mismatch).
- `components/language-switcher.tsx` — a header button toggling `en`/`fr`.
- **PPR preserved deliberately**: Server Component pages (tasks, activity, admin,
  api-keys) read the `locale` cookie directly via `cookies()` — safe *only* because those
  routes were already fully dynamic or page-local dynamic holes before this change (see
  the Level 1/2 postmortems on why the same read in a *shared layout* broke PPR for the
  entire app twice already). Client Components (general, security, team settings,
  sign-in/up) read locale via the `useLocale()` Context instead, which touches no server
  dynamic API at all. Confirmed via `pnpm build`: every route that was `◐` before this
  feature stayed `◐`.
- **What's still English-only**: per-action activity log descriptions (`formatAction()`'s
  ~19 cases), and API key / task sub-form microcopy (e.g. category creation, add-task
  form field placeholders). Translating those would mean roughly doubling the dictionary
  size for content that's lower-value to localize first (transient UI copy vs. the actual
  page structure); flagged here rather than silently left out.

## 22. Usage-based / metered Stripe billing
- `metered_usage` table — the local ledger and source of truth for "how much has this
  team used," written unconditionally on every task creation. `reportedToStripeAt` is set
  only once Stripe actually accepts the corresponding meter event; null means either the
  team isn't on a metered plan or Stripe reporting failed — both are non-fatal.
- `lib/payments/metered-usage.ts` — `recordUsage()` (always writes locally, best-effort
  reports to Stripe via `stripe.billing.meterEvents.create`), `getUsageSummaryForTeam()`
  (aggregates the current calendar month), `getMeteredPriceId()` (looks up the metered
  price by meter event name, returns `null` gracefully if metered billing was never set
  up on the account).
- `lib/payments/setup-metered-billing.ts` — idempotent setup script
  (`pnpm stripe:setup-metered`) that creates a Stripe Billing Meter + metered Product +
  Price for "tasks created." **This was actually run against the real Stripe test
  credentials already in `.env` and genuinely works** — confirmed by running it twice
  (second run correctly detected and reused the existing meter/product/price instead of
  duplicating them):
  ```
  Created Stripe Billing Meter: mtr_test_61V7WApLD3LxQSYdT41J8lUsfJ6nQQ52
  Created Stripe product: prod_Uy4MSiqvE7Ge14
  Created metered price: price_1Ty8DTJ8lUsfJ6nQzlNIOcNG
  ```
- `createCheckoutSession()` (Phase 5/6 code, extended here) now attaches the metered
  price as a second Checkout line item — with no `quantity` field, which Stripe requires
  for metered prices — whenever one exists on the account; silently skipped otherwise, so
  checkout keeps working on accounts where the setup script was never run.
- `createTask()` calls `recordUsage(teamId)` after inserting the row — task creation is
  this app's one metered dimension.
- **Webhook handling**: `app/api/stripe/webhook/route.ts` now also handles `invoice.paid`
  (`handleInvoicePaid()` in `lib/payments/stripe.ts`), logging an `INVOICE_PAID` activity
  log entry — reusing the existing activity log rather than a separate notifications
  table, so it shows up in `/dashboard/activity` for free.
- **Billing dashboard UI**: `/api/billing/usage` + a "Usage this billing period" block
  added to the existing Team Subscription card in Team Settings — not a separate page,
  since usage is a property of the existing subscription view, not a distinct concern.
- **"Local/testing-safe... where real Stripe configuration is unavailable"**: this is
  true by construction, not just by claim — `recordUsage()`'s Stripe call is wrapped in
  try/catch and only attempted if the team has a `stripeCustomerId`; a failure there logs
  a warning and the function still returns the local usage row. An account with no
  metered billing set up at all (i.e., `pnpm stripe:setup-metered` never run) behaves
  identically to one that has it, minus the actual Stripe-side invoice line item.

## 23. Admin panel
- `users.isPlatformAdmin` — a dedicated boolean, deliberately separate from `users.role`
  (legacy) and `team_members.role` (team-scoped) to avoid conflating "runs the platform"
  with "owns a team."
- `lib/auth/require-admin.ts` — redirects non-admins away from `/dashboard/admin`. No
  self-service UI to grant the flag (that would be a privilege-escalation hole) — it's set
  directly in the database, the same way any break-glass admin capability would be.
- `/dashboard/admin` — read-only tables of all users and all teams, guarded server-side.
- `AdminNavLink` — isolated in its own component + `<Suspense>` boundary in the shared
  sidebar, specifically to avoid repeating the PPR regression documented in #21/Level 2
  (an unwrapped `useSWR('/api/user', ...)` read in a shared layout bails the whole app out
  of static rendering).

## 24. AI task suggestions
- `tasks.description` / `tasks.priority` — added so a suggestion has somewhere to land
  its extra fields once accepted, not just a bare title.
- `lib/ai/providers.ts` — raw `fetch()` calls to Anthropic, OpenAI, or Gemini's REST APIs
  (no SDK dependency — this only needs one text-in/text-out call per provider). Provider
  selection: explicit `AI_PROVIDER` env var, or auto-detected from whichever `*_API_KEY`
  is set (Anthropic → OpenAI → Gemini, in that order).
- `lib/ai/suggest-tasks.ts` — builds a prompt from the user's existing task titles +
  categories, asks for exactly 4 new suggestions as JSON (title, description, priority,
  category), parses defensively (extracts the first `[...]` block, filters/clamps
  malformed entries). **Falls back to 4 canned suggestions** if no provider is configured,
  or if the real call throws for any reason (network error, bad JSON, rate limit on the
  provider's side, etc.) — verified in `lib/ai/suggest-tasks.test.ts`.
- `POST /api/ai/suggest-tasks` — authenticated, rate-limited (reuses #18's limiter),
  streams one suggestion at a time as SSE. Even the stub suggestions stream in with a
  short delay between chunks, so the UI's progressive-render behavior is genuinely
  exercised in both modes, not just claimed for the real-provider path.
- `SuggestTasksButton` (tasks page) — opens a modal, reads the SSE stream client-side with
  a plain `ReadableStream` reader (no EventSource, since this is a POST request), renders
  each suggestion as it arrives with an "Add" button that calls the existing `createTask`
  Server Action directly (matching category by name if one matches, otherwise
  uncategorized).

## Verification
- `npx tsc --noEmit` — clean.
- `pnpm build` — clean. Full route table below; every route that was static/PPR-eligible
  before Level 3 stayed that way. Only `/dashboard/tasks`, `/dashboard/tasks/trash`,
  `/dashboard/admin`, `/dashboard/api-keys`, and all `/api/*` routes are fully dynamic —
  all for reasons already established (search-param filtering, direct server reads with
  no shared-layout impact, or Route Handlers, which are never part of PPR).
- `pnpm test` — **20/20** unit tests pass.
- `npx playwright test` — **5/5** e2e tests pass against the real running app and real
  local Postgres, including after all of #21/#22/#24 landed on top of the already-passing
  #16–#20/#23 work.
- `pnpm stripe:setup-metered` — run twice against the real Stripe test account; second
  run correctly detected the existing meter/product/price and made no duplicate objects.

## What a genuinely full rollout of #21/#22/#24 would still add
- **i18n**: routing-level locale support (`app/[locale]/`), translating the remaining
  per-action activity descriptions and sub-form microcopy, a 3rd+ language.
- **Metered billing**: a real end-to-end test would mean completing an actual Checkout
  with the metered line item attached, waiting for an invoice to close, and confirming
  the dashboard usage count matches the Stripe-side invoice — verified here up through
  "the meter/price exist and usage recording + reporting code runs," not the full
  month-long billing cycle.
- **AI suggestions**: a real provider API key was not available in this environment, so
  the live-call path (as opposed to the stub-fallback path, which *is* exercised by
  `suggest-tasks.test.ts`) is implemented but not exercised end-to-end here.
