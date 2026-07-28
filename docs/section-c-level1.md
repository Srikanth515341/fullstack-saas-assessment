# Section C — Level 1 (Beginner) Backlog

All 7 Level 1 features implemented in one branch (`section-c-level1`).

## 1. User profile editing (name, bio)
- Added `bio` column to `users` (`varchar(280)`), migration `0003_odd_black_bolt.sql`.
- Extended `updateAccountSchema`/`updateAccount` (`app/(login)/actions.ts`) and the General Settings form with a `bio` textarea (new `components/ui/textarea.tsx`, matching shadcn's `Input` styling).

## 2. Dark mode toggle
- `components/theme-toggle.tsx` — client button toggling `document.documentElement.classList` and writing a `theme` cookie (1-year max-age), added to the dashboard header.
- Theme is restored on load via a small inline `<script>` in `app/layout.tsx` that reads the cookie and adds the `dark` class **before** hydration.
- **Important design note**: the first attempt read the cookie server-side with `await cookies()` directly in the root layout. That broke Partial Prerendering (`ppr: true` in `next.config.ts`) across the *entire app* — every route flipped from `◐` (Partial Prerender) to `ƒ` (fully dynamic) in the build output, because a direct blocking `cookies()` call in a layout bails the whole subtree out of static rendering. The existing `getUser()`/`getTeamForUser()` calls in the same layout don't have this problem because they're deliberately left un-awaited and consumed later inside `Suspense` boundaries (SWR fallback pattern) — that's what makes them PPR-compatible "dynamic holes" instead of blocking reads. Switched to a client-only inline script instead, which needs no server dynamic API at all. Confirmed fixed via `pnpm build` — PPR indicators returned for `/`, `/dashboard`, `/pricing`, `/sign-in`, `/sign-up`, etc.
- The Tailwind dark-mode infrastructure (`.dark` class variant, full CSS variable set) already existed in `globals.css` from the original starter — this feature was "just" wiring a toggle to already-built theming.

## 3. Search + filter on tasks list
- `getTasksForUser()` (`lib/db/queries.ts`) now accepts `{ search, filter, categoryId }` and builds conditions with `ilike()` (search) and `eq(tasks.completed, ...)` (filter), combined via `and(...conditions)`.
- `app/(dashboard)/dashboard/tasks/page.tsx` reads `searchParams` (`q`, `filter`, `category`) and passes them through.
- `task-filters.tsx` — search input (plain GET form, no client JS needed) + filter/category tabs as `<Link>`s carrying query params, so the whole thing works via URL state alone.

## 4. Pagination on activity log
- `getActivityLogs(page)` now runs two queries in parallel: the page of rows (`limit`/`offset`) and a `count()` for total pages.
- `activity/page.tsx` reads `?page=`, renders Prev/Next links, disables them at the boundaries.

## 5. Toast notifications on every action
- `components/toast-provider.tsx` — a Context + fixed-position container, no new dependency.
- `components/use-action-toast.ts` — a hook that watches a `useActionState` result and fires a toast on change. Compares by **object reference**, not message text — `useActionState` hands back a new object on every transition, so comparing `state.success !== lastMessage` would silently miss a second toast when two submissions produce identical text (e.g. adding two tasks in a row both returning `"Task added."`).
- Wired into every existing form that already produces `{success, error}` state: sign-in/up, General Settings, Security (password + delete), the tasks add-form and new-category form, and Team Settings (remove/invite member).

## 6. Delete-account flow with confirmation
- This already existed in the starter (password re-entry required, soft delete, non-reversible warning shown). Strengthened it with a second explicit gate: a "type `DELETE` to confirm" text input that must match exactly before the destructive button becomes clickable — the same pattern GitHub uses for repo deletion, and a clearer signal of intent than a password field alone (which the user has to type for other reasons too).

## 7. Task categories/tags
- New `task_categories` table (`id`, `userId` FK, `name`, `createdAt`) — one-to-many with `tasks` via a nullable `tasks.categoryId` FK. Same migration as the `bio` column (`0003_odd_black_bolt.sql`).
- `createCategory` Server Action, same `validatedActionWithUser` pattern as everything else.
- Category selection in the add-task form (with inline "new category" creation), category badges on task rows, and category filter tabs (shared UI with #3).

## Verification
- `npx tsc --noEmit` — clean.
- `pnpm build` — clean, all routes generate, PPR preserved on every route except `/dashboard/tasks` (which is legitimately dynamic now, since it reads `searchParams` per-request).
