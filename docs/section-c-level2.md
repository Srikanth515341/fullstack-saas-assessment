# Section C — Level 2 (Intermediate) Backlog

All 8 Level 2 features implemented in one branch (`section-c-level2`). Three of them
(#8, #9, #12) need a real email provider, one (#10) needs real OAuth app credentials,
and one (#11) is set up to swap into real Vercel Blob storage — all working end-to-end
locally right now via clearly-marked stubs. See `.env.example` for what to add when
you're ready to wire in the real services.

## Shared infrastructure
- `verification_tokens` table — one shape (`userId`, `type`, `tokenHash`, `expiresAt`, `usedAt`) shared by password reset and email verification, distinguished by `type`. Tokens are stored as a SHA-256 hash, not raw — same reasoning as password hashing, a leaked DB row shouldn't be usable directly (`lib/auth/tokens.ts`).
- `lib/email/send.ts` — stub `sendEmail()`. Every email call site is already correct; only this function's body needs swapping for a real Resend call once `RESEND_API_KEY` + `pnpm add resend` are in place. Until then it logs the email to the console.

## 8. Password reset via email
- `requestPasswordReset` / `resetPassword` Server Actions (`app/(login)/actions.ts`).
- Deliberately returns the **same** generic success message whether or not the email exists — otherwise the endpoint becomes a way to enumerate registered accounts.
- `/forgot-password` and `/reset-password` pages. `/reset-password` reads `?token=` via `useSearchParams()`, which forced a real fix (see PPR section below).
- 1-hour token expiry, single-use (marked `usedAt` on consumption).

## 9. Email verification on sign-up
- `users.emailVerifiedAt` (nullable timestamp). Sign-up sends a verification email (stub) with a link to `/api/verify-email?token=...`, a Route Handler that consumes the token and redirects to `/dashboard?verified=success`.
- A dismissible-feeling (it just checks `emailVerifiedAt`) banner in the dashboard layout (`verify-email-banner.tsx`) with a "Resend email" button, shown only when unverified.
- Not a hard gate — the user can use the app while unverified, consistent with how most real SaaS products handle this.

## 10. OAuth login (Google + GitHub)
- `lib/auth/oauth.ts` — provider-agnostic authorize-URL builder, code exchange, and profile fetch (handles GitHub's quirk where email is only returned from `/user/emails` if not made public).
- `/api/auth/[provider]` (redirect + CSRF `state` cookie) and `/api/auth/[provider]/callback` (exchange code, account-link-or-create, set session).
- **Account linking logic**: looks up `oauth_accounts` by `(provider, providerAccountId)` first; if not found, matches by email to link an OAuth login to an existing password-based account rather than creating a duplicate user; only creates a brand-new user if neither matches.
- Login buttons only render when `GOOGLE_CLIENT_ID`/`GITHUB_CLIENT_ID` are actually set (`isOAuthProviderConfigured()`), so the UI doesn't show broken buttons out of the box.
- **This is the one feature that's genuinely untested** — there's no local stand-in for a real OAuth provider round-trip. The code is real (real endpoints, real token exchange), but needs you to register actual apps in Google/GitHub's developer consoles and supply the client ID/secret before it can be exercised end-to-end.

## 11. Avatar upload
- `lib/storage/avatar.ts` — writes to `public/avatars/` locally (gitignored, `.gitkeep` tracks the empty dir). Clearly commented swap-in point for `@vercel/blob`'s `put()` once `BLOB_READ_WRITE_TOKEN` is set.
- **Important caveat documented in the code**: this stub only works locally / on a traditional Node server. Vercel's serverless filesystem is read-only outside `/tmp`, so uploads would silently fail to persist in production — that's exactly the gap the real Blob integration exists to close.
- Wired into 3 places that previously only showed initials: General Settings (upload form), the header's `UserMenu` avatar, and the Team Members list — which had a literal comment in the original starter code saying *"This app doesn't save profile images, but here's how you'd show them"* with commented-out example code. That example is now the real implementation.

## 12. Team invitations sent by email
- Replaced the existing `// TODO: Send invitation email` comment in `inviteTeamMember` with a real (stubbed) email send, plus: if the invited email already belongs to a registered user, they also get an **in-app notification** immediately (doesn't wait for them to check email).

## 13. CSV export
- `lib/csv.ts` — a ~20-line serializer, no dependency needed (handles comma/quote/newline escaping, which is the only part that isn't trivial).
- `/api/export/tasks` and `/api/export/activity` Route Handlers, returning `Content-Disposition: attachment` so the browser downloads rather than navigates.

## 14. Soft delete + trash/restore for tasks
- `tasks.deletedAt` (nullable). `deleteTask` now sets it instead of removing the row; `getTasksForUser()` already filters `isNull(deletedAt)`.
- `restoreTask` (clears `deletedAt`) and `permanentlyDeleteTask` (actual hard delete, only reachable from the trash view) — both still scope every query by `userId`, same isolation guarantee as the rest of the tasks feature.
- `/dashboard/tasks/trash` page.

## 15. In-app notifications center
- `notifications` table (`userId`, `message`, `read`, `createdAt`).
- Bell icon in the header, polling `/api/notifications` every 15s via SWR's `refreshInterval` — deliberately polling, not websockets, matching this feature's actual teaching point.
- Unread count badge, click-to-mark-read, mark-all-read.
- Populated from 3 real trigger points (not a synthetic demo): a team invite reaching an existing user, an invitation being accepted (notifies the inviter), and a member being removed from a team (notifies the removed member).

## A real PPR regression this session caught (twice)
Same root cause as a bug from the Level 1 session, but in three new places this time:
`NotificationBell` and `VerifyEmailBanner` both check login state via `useSWR('/api/user', ...)`, and `AvatarUploadForm` reads it too — but none of them were wrapped in a `<Suspense>` boundary, unlike the existing `UserMenu`/`AccountFormWithData` components that read the exact same key correctly. Since `/api/user`'s SWR fallback is an un-awaited `getUser()` promise (which reads cookies internally), consuming it *without* a Suspense boundary bails the surrounding route out of Partial Prerendering entirely — and for the two components living in shared layouts (`(dashboard)/layout.tsx`, wrapping `/`; `(dashboard)/dashboard/layout.tsx`, wrapping every dashboard sub-page), that meant the *entire app* went fully dynamic again, not just one page.

Fix was the same pattern each time: wrap the offending component in its own `<Suspense fallback={...}>`, matching how `UserMenu` was already doing it. Confirmed via `pnpm build` after each fix — all three fixes were necessary before PPR indicators (`◐`) returned across the board; fixing only one or two left the regression partially in place.

**Lesson for next time**: any new component added to a shared layout that reads `useSWR('/api/user', ...)` or `useSWR('/api/team', ...)` needs its own Suspense boundary, full stop — it's not optional per-component styling, it's what keeps that shared layout compatible with static rendering for the routes that don't need to be dynamic.

## Verification
- `npx tsc --noEmit` — clean.
- `pnpm build` — clean. Final route table: every route shared with static marketing pages preserved `◐` Partial Prerender; only `/dashboard/tasks`, `/dashboard/tasks/trash`, and all `/api/*` routes are `ƒ` (fully dynamic), which is correct — they're either query-param-dependent or genuinely need per-request data with no static shell to share.
