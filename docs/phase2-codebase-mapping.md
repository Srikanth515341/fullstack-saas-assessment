# Phase 2 — Codebase Mapping

## 1. Folder structure (one-liner per top-level item)

| Path | What it is |
|---|---|
| `app/` | Next.js App Router — every route, layout, and page |
| `app/(login)/` | Sign-in / sign-up route group + `actions.ts` (auth Server Actions) |
| `app/(dashboard)/` | Marketing pages, pricing, and the authenticated dashboard |
| `app/(dashboard)/dashboard/` | Protected account/team pages (general, security, activity) |
| `app/api/` | Route Handlers — Stripe checkout/webhook, team/user REST endpoints |
| `components/ui/` | shadcn/ui primitives (button, card, input, etc.) |
| `lib/auth/` | `session.ts` (JWT + cookie helpers), `middleware.ts` (Server Action wrappers) |
| `lib/db/` | `schema.ts` (Drizzle schema), `queries.ts`, `migrations/`, `seed.ts`, `setup.ts` |
| `lib/payments/` | `stripe.ts` (Stripe SDK calls), `actions.ts` (checkout/portal Server Actions) |
| `middleware.ts` | Global Next.js middleware — route protection + session refresh |
| `drizzle.config.ts` | Drizzle Kit config (points at `lib/db/schema.ts` + migrations folder) |

## 2. Where things live

| Concept | File |
|---|---|
| Database schema | `lib/db/schema.ts` |
| Migration files | `lib/db/migrations/*.sql` (+ `meta/` snapshots) |
| Auth/session logic | `lib/auth/session.ts` |
| Global middleware | `middleware.ts` |
| Stripe logic | `lib/payments/stripe.ts`, `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts` |
| Server Actions | `app/(login)/actions.ts`, `lib/payments/actions.ts`, action wrappers in `lib/auth/middleware.ts` |

## 3. Written answers

### Where is a session created, and where is it read?
- **Created**: `setSession()` in `lib/auth/session.ts:46`. It signs a JWT (`{ user: { id }, expires }`, HS256, 1-day expiry) with `signToken()` and sets it as an **httpOnly, secure, sameSite=lax** cookie named `session`. Called right after sign-up/sign-in in `app/(login)/actions.ts`.
- **Read**: `getSession()` in `lib/auth/session.ts:40` reads the `session` cookie via `cookies()` and verifies it with `verifyToken()`. It's called wherever the current user is needed — `getUser()` in `lib/db/queries.ts`, and inside `lib/auth/middleware.ts`'s `validatedActionWithUser`/`withTeam` wrappers.
- Additionally, `middleware.ts` reads the cookie **directly** (not via `getSession()`, since Edge/Node middleware can't use `next/headers` the same way) to check route protection and to silently re-sign/refresh the cookie's expiry on every `GET` request.

### Which routes are protected, and by what mechanism?
Two layers:
1. **Global (page-level)**: `middleware.ts` — any path starting with `/dashboard` is checked against the `session` cookie. No cookie → redirect to `/sign-in`. This is the `protectedRoutes` constant + `config.matcher` (which excludes `api`, static assets, favicon).
2. **Local (action-level)**: Server Actions and mutations are wrapped in `lib/auth/middleware.ts`:
   - `validatedActionWithUser` — validates form input with Zod **and** requires `getUser()` to succeed, else throws.
   - `withTeam` — requires a logged-in user **and** resolves their team, else redirects to `/sign-in`.
   
   This second layer matters because API routes (`/api/team`, `/api/user`) and Server Actions aren't covered by the page-level middleware matcher — they enforce auth themselves.

### Where does the app talk to Stripe, and where does Stripe talk back?
- **App → Stripe**: `lib/payments/stripe.ts` — `createCheckoutSession()` calls `stripe.checkout.sessions.create(...)` (triggered from the pricing page via a Server Action in `lib/payments/actions.ts`). `createCustomerPortalSession()` does the same for the billing portal.
- **Stripe → App**: `app/api/stripe/webhook/route.ts` — a Route Handler that receives POSTed events, verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET` via `stripe.webhooks.constructEvent()`, then on `customer.subscription.updated`/`.deleted` calls `handleSubscriptionChange()` (in `stripe.ts`) which updates the `teams` row (plan, status, Stripe IDs) in Postgres.
- There's also a **synchronous callback**: after checkout, Stripe redirects the browser to `success_url` = `/api/stripe/checkout?session_id=...`, a separate Route Handler that reconciles the session immediately (doesn't wait for the webhook).

### Which tables exist and how do they relate? (ER diagram)

```
 users                     teams
 ─────                     ─────
 id (PK)                   id (PK)
 name                      name
 email (unique)            stripeCustomerId (unique)
 passwordHash               stripeSubscriptionId (unique)
 role                       stripeProductId
 createdAt/updatedAt        planName
 deletedAt                  subscriptionStatus
                            createdAt/updatedAt
    │                          │
    │        team_members      │
    │        ────────────      │
    └───────< userId  teamId >─┘
              id (PK)
              role
              joinedAt

 activity_logs                  invitations
 ─────────────                  ───────────
 id (PK)                        id (PK)
 teamId (FK → teams.id)         teamId (FK → teams.id)
 userId (FK → users.id, null)   email
 action                         role
 timestamp                      invitedBy (FK → users.id)
 ipAddress                      invitedAt
                                status
```

- `users` ←→ `teams` is **many-to-many**, resolved through `team_members` (junction table with its own `role` per membership — this is where Owner/Member RBAC actually lives).
- `activity_logs` and `invitations` both belong to a `team` (many-to-one); `invitations` also references the inviting `user`.
- A team's Stripe subscription state (`stripeCustomerId`, `stripeSubscriptionId`, `planName`, `subscriptionStatus`) is billed **per team, not per user** — consistent with this being a team/seat-based SaaS model.

## RBAC note (ties into #9 in Section B)
The role check isn't in `users.role` for team purposes — it's `team_members.role` (`'owner'` vs `'member'`), since a user's permissions are scoped to a specific team, not global. `users.role` is a separate, simpler field (used for platform-level distinctions, defaults to `'member'`).
