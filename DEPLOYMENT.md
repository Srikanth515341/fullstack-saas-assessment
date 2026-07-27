# Phase 6 — Deployment Checklist

## Already verified (from the repo, before deploying)

- [x] **README.md rewritten** — describes this fork, the actual stack, and everything added in Phases 4-5
- [x] **Project structure reviewed** — see `docs/phase2-codebase-mapping.md`
- [x] **`pnpm build` succeeds** — clean production build, all 17 routes generated, including `/dashboard/tasks`
- [x] **No secrets in git history** — full history on `origin` (this repo, not the `upstream` reference remote) scanned for `sk_live_`/`sk_test_`/`whsec_` patterns and for any committed `.env`/`.env.local` file. Clean.
- [x] **`.gitignore` reviewed** — `.env`, `.env*.local`, `.vercel` all excluded
- [x] **Stripe config + webhook route reviewed** — see `docs/phase3-feature-tracing.md` (signature verification via `stripe.webhooks.constructEvent`, dual sync-callback + async-webhook update paths)
- [x] **Vercel/Next.js compatibility** — `next.config.ts` uses `ppr: true` and `clientSegmentCache: true` (experimental, hence the canary version pin), and `middleware.ts` sets `runtime: 'nodejs'` (Node.js Middleware). Both are Vercel-first features, and the local production build already compiles and generates routes cleanly under these settings.

## Still required — needs your accounts (I can't do these for you)

### 1. Production Postgres (Neon)
Your local Postgres runs on `localhost:5432` via pgAdmin — Vercel's servers can't reach it. You need a cloud database:
1. Create a free project at https://neon.tech
2. Copy the connection string it gives you
3. Run migrations against it once, from your machine, by temporarily pointing `POSTGRES_URL` at the Neon string and running:
   ```
   pnpm db:migrate
   ```
   (Don't run `db:seed` against production unless you want the `test@test.com` demo account live publicly.)

### 2. Deploy to Vercel
1. Go to https://vercel.com/new and import `Srikanth515341/fullstack-saas-assessment` from GitHub
2. Framework preset should auto-detect as Next.js
3. Before the first deploy, add these environment variables in the Vercel project settings:

   | Variable | Value |
   |---|---|
   | `POSTGRES_URL` | your Neon connection string |
   | `STRIPE_SECRET_KEY` | your Stripe **test-mode** secret key (same one from local `.env` is fine to reuse) |
   | `STRIPE_WEBHOOK_SECRET` | *(leave a placeholder for now — you'll get the real one in step 3, after your domain exists)* |
   | `BASE_URL` | your Vercel domain, e.g. `https://fullstack-saas-assessment.vercel.app` |
   | `AUTH_SECRET` | a **new** random secret — do not reuse your local dev one. Generate with `openssl rand -hex 32` or ask me to generate one |

4. Deploy

### 3. Production Stripe webhook
Once you have a live domain:
1. Go to https://dashboard.stripe.com/test/webhooks → "Add endpoint"
2. Endpoint URL: `https://<your-domain>.vercel.app/api/stripe/webhook`
3. Select events: `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the signing secret Stripe gives you for this specific endpoint
5. Go back to Vercel project settings and update `STRIPE_WEBHOOK_SECRET` with this value
6. Redeploy (env var changes require a redeploy to take effect)

### 4. Production smoke test
With the app live, manually walk through:
- [ ] Sign up a brand-new account at `/sign-up`
- [ ] Complete a test checkout on `/pricing` with card `4242 4242 4242 4242`
- [ ] Confirm the Stripe test dashboard shows the new customer + subscription
- [ ] Go to `/dashboard/tasks`, create a task, toggle it complete, delete it
- [ ] Check `/dashboard/activity` shows the task events logged

This step can only be done by you, in a real browser, against the real deployed URL — it's the actual pass criterion for this phase ("a public URL where everything works, including your capstone feature").

## Pass criteria reminder
> A public URL where everything works, including your capstone feature.

Everything above the "Still required" line is done. Everything below it needs your Neon account, your Vercel account, and your Stripe dashboard — come back once you've created the Neon project and I can help with the exact env var values and verify the deployed build/routes from the resulting URL.
