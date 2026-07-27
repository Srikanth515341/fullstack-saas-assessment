# Phase 5 — Capstone: Tasks Feature

## What was built

### Schema (`lib/db/schema.ts`)
```ts
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 500 }).notNull(),
  completed: boolean('completed').notNull().default(false),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```
Migration: `lib/db/migrations/0002_lonely_owl.sql` (generated via `pnpm db:generate`, applied via `pnpm db:migrate`).

### Server Actions (`app/(dashboard)/dashboard/tasks/actions.ts`)
- `createTask` — wrapped in `validatedActionWithUser` (same wrapper as `updateAccount`/`inviteTeamMember`), so it's Zod-validated (`title` required, ≤500 chars; `dueDate` optional) **and** auth-protected in one line. Used with `useActionState` for the pending UI.
- `toggleTask` / `deleteTask` — plain Server Actions (single `formData` argument, since they're called via bare `<form action={...}>` with no pending-state requirement). Each validates `taskId` with Zod (`z.coerce.number()`) and checks `getUser()` manually.

### The actual security boundary
Every mutation scopes its `WHERE` clause to the current user, not just the list query:
```ts
where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
```
This is what's being tested by "verify with two accounts" — if only the *list* query filtered by user but toggle/delete trusted a bare `taskId`, any signed-in user could mutate any other user's task by guessing an id (IDOR). Filtering by both columns together means a mismatched owner turns the query into a no-op, not an error — which matters for not leaking whether a given task id exists at all.

### Page (`app/(dashboard)/dashboard/tasks/page.tsx`)
`async` Server Component — same pattern as `activity/page.tsx` from Phase 3, calling `getTasksForUser()` (`lib/db/queries.ts`) directly, no client fetch. That query itself filters `where(eq(tasks.userId, user.id))` and sorts `orderBy(asc(dueDate), desc(createdAt))` — Postgres's default `NULLS LAST` on ascending order means undated tasks sort to the end automatically (stretch goal: sort by due date).

### Add-task form (`add-task-form.tsx`)
Client Component using `useActionState(createTask, {})`, disables the submit button and shows a spinner while `pending`, matching the exact pattern from `login.tsx` and `general/page.tsx`.

### Empty state
Matches the shape of the "No activity yet" block from the activity log page.

### Stretch goals shipped
- **Sort by due date** — done (see above).
- **Activity log integration** — added 3 new `ActivityType` values (`CREATE_TASK`, `COMPLETE_TASK`, `DELETE_TASK`); each task action calls the now-exported `logActivity()` from `app/(login)/actions.ts`. Also had to extend `iconMap`/`formatAction` in `activity/page.tsx` since `iconMap` is typed as `Record<ActivityType, LucideIcon>` — TypeScript enforces every enum member has an icon, so the build would have failed otherwise. This was a good "read the code, know the consequences" moment from Phase 2's mapping.

### Not done (left as stretch)
- Inline editing of task titles
- Filter (all/active/completed) — UI-only addition, query already supports it trivially

## Verification performed

1. **`npx tsc --noEmit`** — clean, no errors.
2. **`pnpm build`** — succeeded; `/dashboard/tasks` registered as a dynamic route (correct — it's per-user data, can't be statically cached).
3. **Cross-user isolation, tested directly against Postgres** using the two real accounts already in the DB (`test@test.com` id 1, and the other seeded account id 2):
   - Inserted one task per user.
   - Ran the *exact* `WHERE id = ? AND user_id = ?` pattern from `toggleTask`/`deleteTask`, simulating user 2 attacking user 1's task by id → `UPDATE 0`, `DELETE 0` (complete no-op).
   - Confirmed the legitimate owner's equivalent query *does* work → `UPDATE 1`.
   - Cleaned up the test rows afterward.

This proves the query logic itself is sound. What it does **not** replace: actually signing in as two real browser sessions and clicking through the UI. That's the one remaining step in the pass criteria that only you can complete — sign in as account A, add a task, sign out, sign in as account B, confirm you see an empty list (or only B's tasks), and confirm A's task id isn't reachable by any UI action.
