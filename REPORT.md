# Update 3 — report

What was built, how it was checked, the assumptions made, and what's still open.

## 1. UI/UX and navigation

- **Grouped, role-aware menu:** Overview · Learning/Classes · Teaching · Community · Administration · Security & policy. Groups fold and remember their state; the group holding the current page always stays open. Items you can't use are hidden, and the server still checks every page.
- **Breadcrumb title** in the top bar links back to the parent section.
- **Shared feedback kit:** toasts, accessible confirm dialogs (with "type to confirm" when needed), and modals with focus trap, Esc and phone bottom-sheet layout. They replace the browser's `confirm()` on the pages touched in this update.
- **Data tables:** search, sort, row selection with a bulk-action bar, paging, and a card layout on phones (no sideways scrolling).
- **Themed scrollbars** that follow the theme colour. Deluxe uses gold.
- **Dashboard "what needs you" strip:**
  - Learners: learning streak, next task, achievements.
  - Mentors: grading backlog, AI suggestions waiting.
  - Admins: flagged accounts, premium ending.
- The level is shown everywhere (Learner / Mentor / Program Administrator / Royal Admin / Super Admin), with a Premium badge for members.
- **Fixed:** the redesigned learner Attendance page had been saved under the wrong address, so `/attendance` still showed the old page. It's now in the right place.

## 2. Themes and Premium

- **13 original anime-style characters**, drawn in code. Their outfits take the theme's colours, they idle gently, and they stand still when reduced motion is on.
  - They appear on the dashboard, sign-in and Premium pages for Anime Deluxe themes.
  - Uploaded (licensed) artwork always takes priority.
  - No copyrighted characters are used.
- **Deluxe flagship style:** gilded gradient borders on cards, dialogs and menus, gold focus rings and scrollbars, and refined buttons.
- **Premium membership:**
  - Off by default.
  - Super Admin controls the policy. Royal Admins choose which theme/style categories and single items are Premium (the Super Admin can delegate this).
  - Ways to get it: grant, extend or revoke (people or a whole program), lifetime option, redeemable codes (hashed, use limits, expiry, program-only, one use per person, atomic, rate-limited).
  - Member page, history, admin console with stats.
  - **Server enforcement:**
    - Saving a premium theme without access is refused.
    - When Premium ends, premium themes pause automatically (the organisation theme is shown, the choice is kept) with a friendly notice.
    - Notices go out 7 days before expiry and on expiry.

## 3. Attendance

- **Roster:** search, select rows and bulk-mark, "rest absent", and keyboard marking (P/A/L/E, ↑/↓, Space).
- **Safe saving:**
  - Unsaved changes are counted and you're warned before leaving.
  - Only changed rows are sent.
  - **Edit-conflict detection** offers "overwrite or reload".
  - Only enrolled learners can be marked.
  - Every change is audited with before → after.
- **Staff attendance hub:**
  - Mentors see their programs; admins see all.
  - Program and date filters; rates, flags for below-threshold and N-in-a-row absences, last attended.
  - Sessions still missing a register.
  - Learner history pages.
  - CSV export (audited, rate-limited, protected against spreadsheet formula injection).
- **Weekly alerts** to flagged learners and a summary to their mentors (configurable; deduplicated).

## 4. Inactive-account automation

- **Rules** (Super Admin):
  - Who: learners and/or mentors, optional programs. Admins are never included.
  - Checks: no sign-in, no submissions (only counted when work was due), no attendance (only when sessions happened). Match on any check or all checks.
  - Skip new accounts.
  - Daily or weekly.
- **Staged:**
  - Remind (in-app + email) → flag for review (admins and the learner's mentors are told) → optional pause after a grace period.
  - Nobody is paused on the first run.
  - There's a cap on pauses per run.
  - A pause disables sign-in and signs the person out. **Nothing is ever deleted**, and the reason is stored.
- **Before going live:** preview (who and why), dry run (logged, changes nothing). Turning on pausing, deleting a rule and running live all need identity confirmation.
- **Review queue:** reactivate, exempt or dismiss. Exempt list on the same page; the exemption switch is also on each user's page.
- **Recovery:**
  - People who become active again are cleared automatically.
  - Reactivating from the Users page starts a fresh cycle.
  - A paused person who signs in with the right password is told their account is paused.

## 5. AI-assisted grading

- **Per assignment:** rubric (criteria with points), private reference answer, guidance, and an AI on/off switch.
- **Grading queue:** ungraded work oldest-first, with items that need attention on top. Batch "Ask AI" runs one submission at a time with a progress bar.
- **Review screen:**
  - Per-criterion AI points and comments, a confidence meter, and flags explained in plain words.
  - A warning if the work changed after the suggestion.
  - Edit, approve (and next), reject, ask again, or grade fully by hand.
  - AI-assisted and manual grades are labelled differently.
- **Rules:**
  - The AI never publishes a grade. Learners see only what a mentor approved.
  - Objective quiz questions are still marked by fixed rules.
  - Everything is audited (AI marks vs final marks, whether edited).
- **Safety:**
  - Learner work is wrapped as data with random delimiters.
  - Prompt-injection phrases are detected and lower confidence.
  - No names or emails are sent; emails and phone numbers in the text are masked.
  - The answer must be JSON; points are clamped and the total is recomputed on the server.
  - Text attachments are read only from your Cloudinary; PDFs and images are flagged as "not read by AI".
  - Monthly request cap with an atomic budget, per-person rate limits, timeouts and retries. Keys live only in environment variables.

## 6. Reports and admin

- **Reports:**
  - Program summaries (learners, sessions, attendance, average grade, ungraded) with CSV export.
  - Grading and AI usage, including the mentor edit rate.
  - Inactive-account counts.
  - Appearance and premium usage.
  - **System health:** database response time, secrets/email/uploads/AI configured, and the last run of each daily job.
- **Daily job** (`/api/cron/daily`, 03:00 UTC): premium notices, attendance alerts, automation and data retention. It's time-boxed for the 10-second limit, safe to repeat, and every run is logged.

## 7. Security

- **Permissions:** one table (`lib/rbac.ts`) with a new **Super Admin** level.
  - Bootstrap: while none exists, royal admins have its powers, so nobody is locked out.
  - Super Admin can delegate four specific jobs downwards. Nothing else can be lowered.
  - Settings saves are checked **per changed field** against the right permission.
- **Identity confirmation:** a signed, httpOnly, 10-minute cookie tied to the account and its session version, rate-limited, and failures are audited. Required for:
  - emergency sign-out
  - royal and Super Admin changes
  - 2FA resets
  - program-wide premium grants
  - turning on account pausing
  - live automation runs and rule deletion
- **Forgot password:**
  - Same answer whether or not the account exists.
  - Hashed single-use token, 30-minute expiry, rate-limited.
  - All sessions are signed out after a reset.
- **Sign out of all devices** from Profile → Security.
- **Blocked sign-in alerts** to the account owner and royal admins (hourly at most).
- **Content-Security-Policy** now limits scripts, styles, fonts, connections and frames to your own site, Google Fonts, Cloudinary and YouTube.
- **Uploads:** attachments must be https Cloudinary links; executables and system scripts are refused (checked in the browser and on the server). Code files (.js, .py, .html) stay allowed for coding courses. Link materials must be http(s).
- **Daily cron** fails closed without `CRON_SECRET` (it can pause accounts).
- Removed the unauthenticated `/api/theme-preview` demo endpoint.
- **Data retention** settings: audit log and read notifications are cleaned daily. Learning data is never touched.
- **Backup / restore scripts:** `pnpm backup`; restore is a dry run by default and never overwrites unless asked.

## 8. Testing done

- **TypeScript:** `tsc` has no errors.
- **Unit tests:** `pnpm test` runs 26 tests, all passing. They cover permissions and delegation, premium tiers and access, inactivity matching and the staged pipeline, AI prompt-injection and PII defences and score parsing, streaks and achievements, the upload policy, and role-aware menus. A test caught one missed injection phrase, which was fixed.
- **CI** now runs the tests and a non-blocking dependency audit.
- **Production build** succeeds.
- **Pages:** every new and changed page was checked as admin, mentor and two learners, on desktop and phone sizes. No sideways overflow, no script errors, and no Content-Security-Policy violations.
- **Flows tested end to end in a browser:**
  - Premium grant, codes, redeem, and re-redeem refused.
  - Locked theme → upgrade dialog; expired-premium notice.
  - AI batch (mock provider) → review → approve & next.
  - Automation preview, dry run, live run with the password prompt (wrong password refused) → 9 reminded → history.
  - Attendance keyboard marking and the edit-conflict dialog.
  - Cron with and without the secret.
  - Forgot / reset password pages.

## 9. Assumptions

- The existing "admin" role = **Program Administrator**. Royal and Super are levels on top of it, not new roles.
- **Premium** is granted by admins or codes. There is no payment provider, so no fake "Pay" button; "How to get it" is your own text.
- **Admins always have premium access**, so they can configure and preview themes. The organisation theme is never gated.
- **AI** suggestions always need a mentor's approval. Auto-publishing was deliberately not offered.
- **Learning streak** counts a week as active if there was a submission, a quiz attempt or an attended session.
- **Attendance rate** = (present + late) ÷ (present + late + absent), with excused left out — the same rule as before.

## 10. Known limitations and remaining risks

- **Not yet verified against your real data:**
  - AI quality depends on the provider and model you choose. It was tested with the mock provider only, because no real AI key was available here. Review a few suggestions closely at first.
  - Emails (reminders, reset links) need `RESEND_API_KEY`. Without it everything still works in-app.
  - The daily job needs `CRON_SECRET`. Large organisations may need two or three runs to finish automation; every run resumes safely.
  - Local testing used a MongoDB-compatible database that lacks some aggregation features, so the existing Users and Security pages couldn't be rendered here. They are unchanged in this update and keep working on MongoDB Atlas. New code avoids those features.
- **Behaviour to be aware of:**
  - Content-Security-Policy still allows inline scripts, because Next.js needs them without per-request nonces. If you add a third-party script (analytics, chat), add its domain in `next.config.ts`.
  - Identity confirmation lasts 10 minutes per browser.
  - The emergency `AUTH_2FA=off` switch also skips the 2FA code in identity confirmation.
- **Not built in this update:**
  - Backups are manual (`pnpm backup`). Consider Atlas scheduled backups on a paid tier.
  - Not done: payments, a mobile app, and AI reading PDFs and images.
- **Still on you:** rotate the database password that was once hard-coded in `lib/db.ts`, if not done yet.
