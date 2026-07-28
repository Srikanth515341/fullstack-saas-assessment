# Fullstack SaaS Platform

A production-ready SaaS application built with Next.js, TypeScript, PostgreSQL, Drizzle ORM, Stripe, and Vercel.

The project started from the [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) template and was extended with authentication, billing, team management, task management, notifications, profile customization, testing, internationalization, advanced authorization, API integrations, and several full-stack features.

## Live Demo

https://fullstack-saas-assessment.vercel.app

## GitHub Repository

https://github.com/Srikanth515341/fullstack-saas-assessment

---

## Project Overview

This application demonstrates the complete lifecycle of a modern SaaS platform:

- User authentication
- Team collaboration
- Subscription billing
- Task management
- Database design and migrations
- Secure server actions
- API development
- Testing
- Deployment

The project was developed as part of a Full-Stack Developer Self-Assessment and showcases full-stack development skills across frontend, backend, database, security, payments, and deployment.

---

## Core Features

### Authentication & Security

- Email/password authentication
- JWT session management
- Secure HTTP-only cookies
- Route protection with middleware
- Zod validation on server actions
- Password reset workflow
- Email verification workflow
- OAuth login support
- Role-based access control (RBAC)

### Team Management

- Team creation and management
- Invite team members
- Owner and Member roles
- Advanced permissions system
- Activity logging

### Subscription & Billing

- Stripe Checkout integration
- Customer Portal integration
- Subscription management
- Usage-based billing support
- Webhook processing

### User Profiles

- Display name support
- Profile editing
- Bio support
- Avatar uploads
- Account deletion workflow

### Task Management System

- Create tasks
- Complete tasks
- Delete tasks
- Restore deleted tasks
- Categories and tags
- Due dates
- Active/completed filtering
- Search functionality
- CSV export
- Activity tracking

### Notifications

- In-app notification center
- Read/unread notifications
- Toast notifications
- User activity updates

### Developer Features

- Public REST API
- API Key management
- Rate limiting
- Automated testing
- Real-time updates
- Internationalization (i18n)

### AI Features

- AI-powered task suggestions

---

## Technical Highlights

### Frontend

- Next.js App Router
- React Server Components
- Client Components
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend

- Server Actions
- Route Handlers
- Authentication
- Authorization
- Stripe Integration

### Database

- PostgreSQL
- Drizzle ORM
- Migrations
- Relational Design

### DevOps

- Vercel Deployment
- Environment Variables
- Production Configuration
- Stripe Webhooks

---

## Database Features

The application includes relational data models for:

- Users
- Teams
- Team Memberships
- Invitations
- Tasks
- Task Categories
- Notifications
- API Keys
- Activity Logs
- Subscriptions
- OAuth Accounts
- Verification Tokens

---

## Testing

The project includes:

- Unit Testing with Vitest
- End-to-End Testing with Playwright

```bash
pnpm test          # unit tests (Vitest)
pnpm test:watch    # unit tests, watch mode
pnpm test:e2e      # e2e tests (Playwright) — requires the dev server + a migrated database
```

---

## Documentation

Project documentation is available in the [`docs`](docs) directory:

- [Phase 2 — Codebase Mapping](docs/phase2-codebase-mapping.md) — folder structure, where everything lives, ER diagram
- [Phase 3 — Feature Tracing](docs/phase3-feature-tracing.md) — sign-up flow, checkout flow, RSC vs. client-fetch patterns
- [Phase 4 — Break & Modify](docs/phase4-break-and-modify.md) — schema migration, an intentional break and the fix
- [Phase 5 — Capstone: Tasks Feature](docs/phase5-capstone-tasks.md) — the tasks feature and its user-isolation guarantees
- [Section C, Level 1](docs/section-c-level1.md) — profile editing, dark mode, search/filter, pagination, toasts, delete confirmation, task categories
- [Section C, Level 2](docs/section-c-level2.md) — password reset, email verification, OAuth, avatar upload, team invite emails, CSV export, soft delete/trash, notifications center
- [Section C, Level 3](docs/section-c-level3.md) — RBAC, public API + API keys, rate limiting, real-time updates, testing, i18n, metered billing, admin panel, AI suggestions
- [Deployment Guide](DEPLOYMENT.md) — production deployment checklist (Neon Postgres, Vercel env vars, production Stripe webhook, smoke test)

---

## Tech Stack

### Framework

- Next.js

### Language

- TypeScript

### Database

- PostgreSQL

### ORM

- Drizzle ORM

### Authentication

- JWT
- OAuth

### Payments

- Stripe

### Styling

- Tailwind CSS
- shadcn/ui

### Deployment

- Vercel

---

## Local Development

Clone and install dependencies:

```bash
git clone https://github.com/Srikanth515341/fullstack-saas-assessment.git
cd fullstack-saas-assessment
pnpm install
```

Create a `.env` file in the project root (see [`.env.example`](.env.example) for the full list, including optional keys for OAuth, email, AI providers, and metered billing — every optional feature degrades gracefully without them):

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

This creates a default user (`test@test.com` / `admin123`) and team. You can also create new users through `/sign-up`.

[Install](https://docs.stripe.com/stripe-cli) the Stripe CLI, log in, and forward webhooks to your local server:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To enable metered/usage-based billing locally, run once against your Stripe test account:

```bash
pnpm stripe:setup-metered
```

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full production deployment checklist.
