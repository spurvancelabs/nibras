# Update 4 — changed files

Copy every file below into your project at the same path (complete files — just overwrite). Nothing needs deleting this time.

**49 new · 61 updated** (the 3 docs included)

> `package.json` and `pnpm-lock.yaml` changed (two new packages: `unpdf`, `fflate`). Run `pnpm install` and commit both.

## New files

- `app/(app)/admin/courses/CoursesTable.tsx`
- `app/(app)/admin/courses/[id]/CourseEditor.tsx`
- `app/(app)/admin/courses/[id]/VideoUpload.tsx`
- `app/(app)/admin/courses/[id]/page.tsx`
- `app/(app)/admin/courses/actions.ts`
- `app/(app)/admin/courses/page.tsx`
- `app/(app)/admin/premium/PlansPanel.tsx`
- `app/(app)/admin/tokens/AdjustTokens.tsx`
- `app/(app)/admin/tokens/actions.ts`
- `app/(app)/admin/tokens/page.tsx`
- `app/(app)/courses/CourseBits.tsx`
- `app/(app)/courses/[slug]/EnrollButton.tsx`
- `app/(app)/courses/[slug]/learn/[lessonId]/LessonPlayer.tsx`
- `app/(app)/courses/[slug]/learn/[lessonId]/page.tsx`
- `app/(app)/courses/[slug]/page.tsx`
- `app/(app)/courses/actions.ts`
- `app/(app)/courses/page.tsx`
- `app/(app)/grading/report/[id]/export/route.ts`
- `app/(app)/grading/report/[id]/page.tsx`
- `app/(app)/premium/PlanCards.tsx`
- `app/(app)/sessions/[id]/LockedSession.tsx`
- `app/(app)/wallet/SendTokens.tsx`
- `app/(app)/wallet/actions.ts`
- `app/(app)/wallet/page.tsx`
- `app/register/RegisterForm.tsx`
- `app/register/actions.ts`
- `app/register/page.tsx`
- `app/verify-email/VerifyButton.tsx`
- `app/verify-email/page.tsx`
- `components/palette-events.ts`
- `lib/attachment-reader.ts`
- `lib/attachment-text.ts`
- `lib/cache.ts`
- `lib/courses-core.ts`
- `lib/courses.ts`
- `lib/grading-report-core.ts`
- `lib/premium-plans.ts`
- `lib/registration.ts`
- `lib/session-access.ts`
- `lib/theme-shift.ts`
- `lib/tokens-core.ts`
- `lib/tokens.ts`
- `models/Course.ts`
- `models/EmailVerification.ts`
- `models/Enrollment.ts`
- `models/PremiumPlan.ts`
- `models/TokenTransaction.ts`
- `models/Unlock.ts`
- `tests/update4.test.ts`

## Updated files

- `app/(app)/admin/premium/actions.ts`
- `app/(app)/admin/premium/page.tsx`
- `app/(app)/admin/settings/SettingsShell.tsx`
- `app/(app)/admin/settings/actions.ts`
- `app/(app)/admin/settings/page.tsx`
- `app/(app)/admin/settings/sections/Learning.tsx`
- `app/(app)/admin/settings/sections/Policy.tsx`
- `app/(app)/admin/settings/sections/types.ts`
- `app/(app)/admin/users/UsersTable.tsx`
- `app/(app)/admin/users/page.tsx`
- `app/(app)/assignments/actions.ts`
- `app/(app)/dashboard/FocusStrip.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/grading/page.tsx`
- `app/(app)/grading/review/[id]/ReviewForm.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/premium/actions.ts`
- `app/(app)/premium/page.tsx`
- `app/(app)/profile/PersonalAppearance.tsx`
- `app/(app)/quizzes/actions.ts`
- `app/(app)/sessions/SessionForm.tsx`
- `app/(app)/sessions/[id]/attendance/actions.ts`
- `app/(app)/sessions/[id]/page.tsx`
- `app/(app)/sessions/actions.ts`
- `app/(app)/sessions/page.tsx`
- `app/globals.css`
- `app/login/LoginForm.tsx`
- `app/login/page.tsx`
- `components/AppShell.tsx`
- `components/CommandPalette.tsx`
- `components/NavIcon.tsx`
- `components/Sidebar.tsx`
- `components/ThemeToggle.tsx`
- `lib/ai-provider.ts`
- `lib/audit.ts`
- `lib/auth-helpers.ts`
- `lib/auth-state.ts`
- `lib/auth.ts`
- `lib/daily-jobs.ts`
- `lib/grading.ts`
- `lib/nav.ts`
- `lib/premium.ts`
- `lib/quizzes.ts`
- `lib/rbac.ts`
- `lib/sessions.ts`
- `lib/settings.ts`
- `lib/theme-config.ts`
- `lib/ui-styles.ts`
- `lib/users.ts`
- `models/Attendance.ts`
- `models/GradeSuggestion.ts`
- `models/Session.ts`
- `models/Setting.ts`
- `models/Submission.ts`
- `models/User.ts`
- `next.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `CHANGES.md`
- `UPGRADE.md`
- `REPORT.md`
