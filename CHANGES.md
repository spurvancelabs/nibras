# Update 2 — changed files

Copy every file below into your project at the same path (complete files — just overwrite). Then delete the files at the bottom and run `pnpm install`.

**29 new · 34 updated · 7 to delete**

## New files

- `app/(app)/admin/settings/SettingsShell.tsx` — Redesigned settings page
- `app/(app)/admin/settings/sections/Access.tsx`
- `app/(app)/admin/settings/sections/Appearance.tsx` — Appearance studio
- `app/(app)/admin/settings/sections/Learning.tsx`
- `app/(app)/admin/settings/sections/Organisation.tsx`
- `app/(app)/admin/settings/sections/People.tsx`
- `app/(app)/admin/settings/sections/types.ts`
- `app/(app)/admin/users/[id]/ResetTwoFactor.tsx`
- `app/(app)/profile/AccountForm.tsx`
- `app/(app)/profile/PasswordForm.tsx`
- `app/(app)/profile/PersonalAppearance.tsx`
- `app/(app)/profile/TwoFactorPanel.tsx` — Two-step sign-in setup
- `app/(app)/search-actions.ts`
- `components/CommandPalette.tsx` — Ctrl/⌘ K palette
- `components/MobileNav.tsx` — Phone bottom tab bar
- `components/NavIcon.tsx`
- `components/UiStylePicker.tsx` — Design style gallery
- `components/UserMenu.tsx` — Account menu
- `components/appearance/preview.tsx`
- `components/settings-ui.tsx`
- `lib/nav.ts` — Shared navigation map
- `lib/search.ts` — Command-palette search
- `lib/theme-scenes.ts` — Illustrated scenes for Deluxe & Anime Deluxe themes
- `lib/totp.ts` — Authenticator codes (two-step sign-in)
- `lib/two-factor.ts` — Two-step sign-in logic
- `lib/ui-fonts.ts` — Fonts used by styles/themes
- `lib/ui-patterns.ts` — Background patterns & backdrops for the styles
- `lib/ui-styles.ts` — 156 design styles (Glassmorphism … Adaptive UI)
- `lib/user-agent.ts` — Sign-in history device names

## Updated files (replace completely)

- `UPGRADE.md`
- `app/(app)/admin/security/page.tsx`
- `app/(app)/admin/settings/actions.ts`
- `app/(app)/admin/settings/page.tsx`
- `app/(app)/admin/users/[id]/page.tsx`
- `app/(app)/admin/users/actions.ts`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/layout.tsx`
- `app/(app)/profile/actions.ts`
- `app/(app)/profile/page.tsx`
- `app/globals.css` — Design-style layer
- `app/layout.tsx`
- `app/login/LoginForm.tsx`
- `app/login/page.tsx`
- `components/AppShell.tsx`
- `components/NotificationBell.tsx`
- `components/Sidebar.tsx`
- `components/ThemePresetPicker.tsx` — Colour theme gallery
- `components/ThemeToggle.tsx`
- `lib/audit.ts`
- `lib/auth-helpers.ts` — 2FA policy enforcement
- `lib/auth-state.ts`
- `lib/auth.ts` — Two-step sign-in, session length, new-network alerts
- `lib/constants.ts`
- `lib/settings.ts` — Cache-safe settings
- `lib/theme-config.ts` — New settings fields, fonts, presets
- `lib/theme-css.ts` — Builds theme + style CSS
- `lib/theme-presets.ts` — 550 colour themes (35 categories)
- `lib/users.ts`
- `models/Setting.ts`
- `models/User.ts`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/seed.ts` — Hardcoded password removed

## Delete these files (and the three now-empty folders `app/test-theme`, `app/theme-demo`, `app/theme-settings`)

- `app/(app)/admin/settings/SettingsForm.tsx`
- `app/(app)/profile/PersonalTheme.tsx`
- `app/(app)/profile/ProfileForm.tsx`
- `app/test-theme/page.tsx`
- `app/theme-demo/page.tsx`
- `app/theme-settings/page.tsx`
- `components/ThemeCustomizer.tsx`

See UPGRADE.md (top section) for what changed and the test checklist.
