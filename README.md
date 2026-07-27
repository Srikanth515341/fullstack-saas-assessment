# Full-Stack Developer Self-Assessment — Next.js SaaS Starter

This repository is my submission for the Full-Stack Developer Self-Assessment, built on top of [nextjs/saas-starter](https://github.com/nextjs/saas-starter). It demonstrates the full stack end to end: authentication, RBAC, Stripe billing, and a capstone feature shipped through every layer (schema → migration → Server Actions → UI).

**Repository**: https://github.com/Srikanth515341/fullstack-saas-assessment

## What I added on top of the starter

- **`displayName` field** on `users` — new column, migration, wired through the account update action and the General Settings form (Phase 4)
- **`/dashboard/notes`** — a new protected page proving the global middleware covers any route under `/dashboard` with no per-page auth code (Phase 4)
- **`/dashboard/tasks`** — capstone feature: a full todo/task manager (Phase 5)
  - `tasks` table (`id`, `userId` FK, `title`, `completed`, `dueDate`, `createdAt`) with its own migration
  - `createTask` / `toggleTask` / `deleteTask` Server Actions, each Zod-validated and scoped to the signed-in user (`WHERE user_id = ?` on every mutation, not just the list query — this is what actually prevents one account from touching another account's tasks)
  - Add-task form with a pending/loading state (`useActionState`)
  - Empty state when a user has no tasks
  - Tasks sort by due date (undated tasks last)
  - Task events (create/complete/delete) logged to the existing activity log
- Updated pricing plan feature lists on `/pricing`

## Architecture notes

Written while working through the assessment phases — these hold the actual reasoning, not just a feature list:

- [`docs/phase2-codebase-mapping.md`](docs/phase2-codebase-mapping.md) — folder structure, where everything lives, ER diagram
- [`docs/phase3-feature-tracing.md`](docs/phase3-feature-tracing.md) — sign-up flow, checkout flow (including the dual sync-callback/async-webhook paths), and the RSC-vs-client-fetch contrast between the activity log and team settings pages
- [`docs/phase4-break-and-modify.md`](docs/phase4-break-and-modify.md) — the `displayName` migration, an intentionally-broken import and the exact TypeScript error that led to the fix
- [`docs/phase5-capstone-tasks.md`](docs/phase5-capstone-tasks.md) — the tasks feature, plus the isolation test proving cross-user access is blocked at the query level
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — production deployment checklist

## Features (from the original starter)

- Marketing landing page (`/`) with animated Terminal element
- Pricing page (`/pricing`) which connects to Stripe Checkout
- Dashboard pages with CRUD operations on users/teams
- Basic RBAC with Owner and Member roles (scoped per-team via `team_members.role`)
- Subscription management with Stripe Customer Portal
- Email/password authentication with JWTs stored to cookies
- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas
- Activity logging system for any user events

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS
- **Deployment**: [Vercel](https://vercel.com/)

## Getting Started

```bash
git clone https://github.com/Srikanth515341/fullstack-saas-assessment.git
cd fullstack-saas-assessment
pnpm install
```

## Running Locally

[Install](https://docs.stripe.com/stripe-cli) and log in to your Stripe account:

```bash
stripe login
```

Create a `.env` file in the project root (see `.env.example`) with:

```
POSTGRES_URL=postgresql://<user>:<password>@localhost:5432/<database>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BASE_URL=http://localhost:3000
AUTH_SECRET=<random 32-byte hex string>
```

Run the database migrations and seed the database with a default user and team:

```bash
pnpm db:migrate
pnpm db:seed
```

This will create the following user and team:

- User: `test@test.com`
- Password: `admin123`

You can also create new users through the `/sign-up` route.

Finally, run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

You can listen for Stripe webhooks locally through their CLI to handle subscription change events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full production deployment checklist (Neon Postgres, Vercel environment variables, production Stripe webhook, and post-deploy smoke test).
