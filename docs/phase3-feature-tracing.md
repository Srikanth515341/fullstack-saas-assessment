# Phase 3 — Feature Tracing

## Trace 1: Sign-up flow

1. User submits the sign-up form — `app/(login)/sign-up/page.tsx` renders `<Login mode="signup" />` from `app/(login)/login.tsx`, a **Client Component** (`'use client'`) using `useActionState(signUp, ...)`. Hidden fields carry `redirect`, `priceId`, `inviteId` from the URL's query params.
2. Form submit calls the Server Action `signUp` in `app/(login)/actions.ts:109`, wrapped by `validatedAction(signUpSchema, ...)` (`lib/auth/middleware.ts`).
3. `validatedAction` runs `signUpSchema.safeParse(formData)` first — a **Zod schema** (`email`, `password.min(8)`, optional `inviteId`). If invalid, returns `{ error }` immediately; the wrapped action body never runs.
4. Inside the action: checks `users` table for an existing row with that email (reject if found), then hashes the password with `hashPassword()` → `bcryptjs.hash(password, 10)` (`lib/auth/session.ts`).
5. `db.insert(users).values(newUser).returning()` — Drizzle insert, default `role: 'owner'`.
6. Branches on `inviteId`:
   - **With invite**: looks up a matching pending `invitations` row, marks it `accepted`, uses its `teamId`/`role`.
   - **Without invite**: creates a brand-new `teams` row (`"{email}'s Team"`), user becomes `'owner'`.
7. Inserts a `team_members` row linking the new user to the team, in parallel with `logActivity(SIGN_UP)` and `setSession(createdUser)`.
8. `setSession()` (`lib/auth/session.ts:46`) signs a JWT (`{ user: { id }, expires }`, 1-day expiry) and sets it as an httpOnly/secure/sameSite=lax cookie named `session`.
9. If `redirect === 'checkout'` was in the hidden form fields (came from clicking a pricing plan while logged out), it immediately calls `createCheckoutSession()` instead of redirecting to the dashboard — so sign-up-to-checkout is a single flow, not two round trips.
10. Otherwise: `redirect('/dashboard')`.

## Trace 2: Checkout flow

1. `/pricing` page displays plans (via `getStripePrices()`/`getStripeProducts()` in `lib/payments/stripe.ts`); each plan's button is a form calling the `checkoutAction` Server Action (`lib/payments/actions.ts:7`).
2. `checkoutAction` is wrapped in `withTeam()` (`lib/auth/middleware.ts:61`) — requires a logged-in user (redirects to `/sign-in` if not) and resolves their team via `getTeamForUser()`.
3. Calls `createCheckoutSession({ team, priceId })` (`lib/payments/stripe.ts:14`), which calls `stripe.checkout.sessions.create(...)` — `mode: 'subscription'`, 14-day trial, `client_reference_id` set to the user's ID (this is how Stripe later tells us *which user* paid), `success_url` pointing at `/api/stripe/checkout?session_id=...`.
4. Browser redirects to Stripe's hosted Checkout page. User pays with test card `4242 4242 4242 4242`.
5. **Two things happen in parallel from here, not one linear step:**
   - **(a) Synchronous callback**: Stripe redirects the browser to `success_url` → `app/api/stripe/checkout/route.ts` (`GET`). This route retrieves the Checkout Session + Subscription from Stripe directly, reads `client_reference_id` to find the user, finds their team via `team_members`, and **immediately updates the `teams` row** (`stripeCustomerId`, `stripeSubscriptionId`, `stripeProductId`, `planName`, `subscriptionStatus`). It also refreshes the session cookie via `setSession()`, then redirects to `/dashboard`.
   - **(b) Async webhook**: Stripe also fires `customer.subscription.updated`/`created` server-to-server at `app/api/stripe/webhook/route.ts` (`POST`). This verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET` via `stripe.webhooks.constructEvent()`, then calls `handleSubscriptionChange()` (`lib/payments/stripe.ts:117`), which looks the team up **by `stripeCustomerId`** (not user ID) and updates the same fields.
6. Later, "Manage Subscription" on the dashboard calls `customerPortalAction` → `createCustomerPortalSession()`, which creates/reuses a Stripe Billing Portal configuration and redirects the user there to change plan or cancel.

**Why both (a) and (b) exist**: (a) makes the UI feel instant (user lands on `/dashboard` already showing the new plan) without waiting for a webhook round-trip; (b) is the source of truth that keeps working even if the browser is closed before the redirect completes, or for later lifecycle events (cancellation, payment failure) that have no redirect at all.

## Trace 3: Data read via a Server Component

**Actual example in this codebase**: `app/(dashboard)/dashboard/activity/page.tsx`.

1. It's `export default async function ActivityPage()` — an `async` Server Component, no `'use client'`.
2. Directly calls `await getActivityLogs()` (`lib/db/queries.ts:81`) — a plain server-side function, no `fetch`, no API route.
3. `getActivityLogs()` internally calls `getUser()` (`lib/db/queries.ts:7`): reads the `session` cookie via `cookies()`, verifies the JWT with `verifyToken()`, checks expiry, then does a Drizzle `select` against `users` filtered by the decoded `id` (and `isNull(deletedAt)`).
4. With the user resolved, it runs a second Drizzle query joining `activityLogs` to `users`, filtered `where(eq(activityLogs.userId, user.id))`, ordered by `timestamp desc`, limited to 10.
5. The rendered HTML (already containing the user's data) is what's sent to the browser — no client-side loading state, no waterfall.

**Important correction versus the phase wording**: the *main* `/dashboard` page (`dashboard/page.tsx`, "Team Settings") is actually a **Client Component** — it fetches via `useSWR('/api/team', fetcher)` and `useSWR('/api/user', fetcher)`, which hit `app/api/team/route.ts` and `app/api/user/route.ts` (thin Route Handlers that just call `getTeamForUser()`/`getUser()` and return JSON). That's a deliberate contrast worth knowing for interviews: **the same `getUser()`/`getTeamForUser()` functions get reused in two different rendering models** — direct RSC calls (activity page) vs. client-side SWR hitting a Route Handler (team settings page). Being able to explain *why* a page would choose one over the other (e.g. `TeamMembers`/`InviteTeamMember` need client-side re-fetching after a mutation, via SWR's `mutate()`) is a stronger answer than just describing one pattern.

---

**Self-check reminder**: this doc was written by reading the code start-to-finish. Reading it isn't the same as passing Phase 3 — the actual pass criterion is explaining both flows out loud from memory. Re-derive the numbered lists yourself before treating this as done.
