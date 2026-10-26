# Update 3 — changed files

Copy every file below into your project at the same path (complete files — just overwrite). Then delete the file at the bottom.

**75 new · 56 updated · 1 to delete**

## New files

- `app/(app)/admin/automation/AutomationAdmin.tsx`
- `app/(app)/admin/automation/actions.ts`
- `app/(app)/admin/automation/page.tsx`
- `app/(app)/admin/premium/PremiumAdmin.tsx`
- `app/(app)/admin/premium/actions.ts`
- `app/(app)/admin/premium/page.tsx`
- `app/(app)/admin/reports/ProgramTable.tsx`
- `app/(app)/admin/reports/export/route.ts`
- `app/(app)/admin/reports/page.tsx`
- `app/(app)/admin/settings/sections/Policy.tsx`
- `app/(app)/admin/users/[id]/AccountExtras.tsx`
- `app/(app)/attendance/LearnerTable.tsx`
- `app/(app)/attendance/StaffAttendance.tsx`
- `app/(app)/attendance/export/route.ts`
- `app/(app)/attendance/learners/[id]/page.tsx`
- `app/(app)/dashboard/FocusStrip.tsx`
- `app/(app)/grading/QueueTable.tsx`
- `app/(app)/grading/actions.ts`
- `app/(app)/grading/page.tsx`
- `app/(app)/grading/review/[id]/ReviewForm.tsx`
- `app/(app)/grading/review/[id]/page.tsx`
- `app/(app)/grading/setup/[id]/SetupForm.tsx`
- `app/(app)/grading/setup/[id]/page.tsx`
- `app/(app)/premium/RedeemForm.tsx`
- `app/(app)/premium/actions.ts`
- `app/(app)/premium/page.tsx`
- `app/(app)/profile/SignOutEverywhere.tsx`
- `app/(app)/progress/page.tsx`
- `app/(app)/reauth-actions.ts`
- `app/api/cron/daily/route.ts` — Daily job endpoint (needs CRON_SECRET)
- `app/forgot-password/ForgotForm.tsx`
- `app/forgot-password/actions.ts`
- `app/forgot-password/page.tsx`
- `app/reset-password/AuthCard.tsx`
- `app/reset-password/ResetForm.tsx`
- `app/reset-password/page.tsx`
- `components/Character.tsx` — 13 original anime-style characters (theme-coloured)
- `components/DataTable.tsx` — Search / sort / select / bulk actions / paging
- `components/charts.tsx` — Theme-aware SVG charts
- `components/feedback.tsx` — Toasts, confirm dialogs, modal, identity prompt
- `lib/ai-grading-core.ts` — Prompt building, injection & PII defences (tested)
- `lib/ai-provider.ts` — Any OpenAI-compatible AI provider
- `lib/appearance.ts`
- `lib/attendance-reports.ts` — Rates, streaks, flags, missing registers, CSV
- `lib/automation-match.ts` — Inactivity rules (pure, tested)
- `lib/automation.ts` — Inactive-account automation engine
- `lib/daily-jobs.ts` — Daily maintenance jobs
- `lib/entitlements.ts` — Free vs Premium themes & styles
- `lib/grading.ts` — Grading queue + AI suggestions + approval
- `lib/learner-progress.ts` — Learner progress, streaks, achievements
- `lib/password-reset.ts` — Forgot-password by email
- `lib/premium.ts` — Memberships, codes, history, expiry notices
- `lib/progress-core.ts`
- `lib/rbac.ts` — One permission table (Learner → Mentor → Program Admin → Royal → Super)
- `lib/reauth-shared.ts`
- `lib/reports.ts` — Admin reports & system health
- `lib/sudo.ts` — Confirm-your-identity for high-impact actions
- `lib/super.ts` — Super Admin status + bootstrap
- `lib/upload-policy.ts` — Allowed files & links
- `models/AccountFlag.ts`
- `models/AiUsage.ts`
- `models/AutomationRule.ts`
- `models/AutomationRun.ts`
- `models/GradeSuggestion.ts`
- `models/GradingConfig.ts`
- `models/MembershipEvent.ts`
- `models/PasswordReset.ts`
- `models/PremiumCode.ts`
- `scripts/backup.ts`
- `scripts/restore.ts`
- `tests/ai-grading.test.ts`
- `tests/automation.test.ts`
- `tests/entitlements.test.ts`
- `tests/progress-and-uploads.test.ts`
- `tests/rbac.test.ts`

## Updated files

- `.github/workflows/ci.yml`
- `.gitignore`
- `app/(app)/admin/security/SecurityControls.tsx`
- `app/(app)/admin/security/actions.ts`
- `app/(app)/admin/security/page.tsx`
- `app/(app)/admin/settings/SettingsShell.tsx`
- `app/(app)/admin/settings/actions.ts`
- `app/(app)/admin/settings/page.tsx`
- `app/(app)/admin/settings/sections/types.ts`
- `app/(app)/admin/users/[id]/ResetTwoFactor.tsx`
- `app/(app)/admin/users/[id]/RoyalToggle.tsx`
- `app/(app)/admin/users/[id]/page.tsx`
- `app/(app)/admin/users/actions.ts`
- `app/(app)/assignments/actions.ts`
- `app/(app)/attendance/page.tsx` — Learner page fixed + staff hub
- `app/(app)/dashboard/page.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/profile/PersonalAppearance.tsx`
- `app/(app)/profile/actions.ts`
- `app/(app)/profile/page.tsx`
- `app/(app)/queries/actions.ts`
- `app/(app)/sessions/[id]/AttendancePanel.tsx` — Bulk/keyboard marking, conflict detection
- `app/(app)/sessions/[id]/attendance/actions.ts`
- `app/(app)/sessions/[id]/attendance/page.tsx` — Now forwards to the session page
- `app/(app)/sessions/[id]/materials/actions.ts`
- `app/globals.css`
- `app/login/LoginForm.tsx`
- `app/login/page.tsx`
- `components/AppShell.tsx`
- `components/CloudinaryUpload.tsx`
- `components/CommandPalette.tsx`
- `components/FileUpload.tsx`
- `components/MobileNav.tsx`
- `components/NavIcon.tsx`
- `components/Sidebar.tsx` — Collapsible menu groups
- `components/ThemePresetPicker.tsx`
- `components/UiStylePicker.tsx`
- `components/UserMenu.tsx`
- `components/providers.tsx`
- `lib/attendance.ts`
- `lib/audit.ts`
- `lib/auth-helpers.ts`
- `lib/auth-state.ts`
- `lib/auth.ts` — Paused-account message, blocked sign-in alerts
- `lib/constants.ts`
- `lib/nav.ts` — Grouped, role-aware menu
- `lib/royal.ts`
- `lib/settings.ts`
- `lib/theme-config.ts`
- `lib/ui-styles.ts`
- `lib/users.ts`
- `models/Setting.ts`
- `models/User.ts`
- `next.config.ts` — Stricter Content-Security-Policy
- `package.json`
- `vercel.json` — Adds the daily cron

## Delete this file

- `app/api/theme-preview/route.ts`

Also included: `UPGRADE.md`, `REPORT.md` and this file.
