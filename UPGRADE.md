# Nibras LMS — upgrade notes

## Update 2 — design, themes & security (October 2026)

Apply on top of Update 1. **No database migration is needed**: every new setting and user field has a safe default, and nobody is signed out by deploying.

### How to apply

1. Copy every file from this package into your project, keeping the same paths (overwrite existing files). `CHANGES.md` lists each file as NEW or UPDATED.
2. **Delete** the 7 files listed under "Delete these files" in `CHANGES.md`.
3. Run `pnpm install` (adds the `qrcode` package, used for the two-step sign-in QR code), then commit.
4. Deploy to a **Vercel preview** first and run the checklist below.

### New environment variable (optional)

| Variable | What it does | Default |
|---|---|---|
| `AUTH_2FA` | Emergency only: `off` skips the two-step code at sign-in for everyone (e.g. if many people lose their phones). Redeploy after changing it. | on |

### What's new

**Appearance**
- **550 colour themes** in 35 categories. Every theme passes contrast checks in light AND dark mode.
- **Deluxe** (24) and **Anime Deluxe** (28) themes come with original illustrated scenes, each with a night version for dark mode: sakura, moonlit shrine, lantern festival, starfall, waves, frost, storm, koi pond, sky islands, art deco, marble and more.
- **156 design styles**: every style from your list plus Classic, Deluxe, Anime Deluxe, Anime Night Festival, Royal Palace and Retro Futurism Classic. Examples: Glassmorphism, Liquid Glass, Neumorphism, Claymorphism, Neobrutalism, Windows 95/XP, Cyberpunk HUD, Art Deco, Hand-Drawn, Pixel Art, Terminal and Kawaii. Any style works with any colour theme.
- **Artwork slot:** upload your own (licensed) artwork; it appears on the dashboard welcome card and the sign-in page.
- **Personal appearance:** each user can pick their own theme and style in Profile → Appearance, if the admin allows it.

**Settings page** (fully redesigned)
- Section navigation (sidebar on desktop, swipeable pills on phones) and a search across every setting.
- One sticky save bar showing how many changes are unsaved, with Discard and Ctrl/⌘ S.
- A warning if you try to leave with unsaved changes.
- **Live preview:** appearance changes, and hovering a theme or style, restyle the whole page instantly. Nothing is saved until you press Save.
- New sections: Appearance studio, Security, Maintenance.

**Whole app**
- New sidebar: search box, collapsible rail (remembered), tooltips.
- New top bar: account menu with mode switch and sign-out.
- **Mobile bottom tab bar.**
- **Command palette (Ctrl/⌘ K or /):** jump to any page, run quick actions, and search programs, sessions, assignments, quizzes and users. Results are role-aware and rate-limited.
- **Profile** redesigned with tabs: Account, Security and Appearance.
- Sign-in page shows the form on a card.
- Long titles no longer push pages sideways on phones.

**Security**
- **Two-step sign-in** (authenticator app, e.g. Google Authenticator or Microsoft Authenticator):
  - Setup with a QR code, plus 10 single-use recovery codes.
  - A code can't be reused (replay protection); wrong codes count towards the sign-in rate limit.
  - Policy (royal admins only): *Optional* (default) · *Required for admins* · *Admins & mentors* · *Everyone* · *Off*.
  - When it's required, people are sent to set it up; they are never locked out.
  - A royal admin can reset a user's two-step sign-in from the user's page.
- **Session length** setting (default 30 days). Sessions from before this update are not affected.
- **Minimum password length** for self-chosen passwords. Passwords admins set, such as phone numbers, are not affected.
- **New-network sign-in alerts** for admins and mentors (in-app).
- Profile shows **recent sign-in activity** (browser, OS, IP).
- **Security dashboard** shows two-step adoption by role.
- Removed three public demo pages (`/test-theme`, `/theme-demo`, `/theme-settings`) that exposed settings to anyone.
- `scripts/seed.ts` contained a **real admin password**. It now reads `SEED_ADMIN_*` environment variables. **If that admin account still uses the old password, change it.**
- A database hiccup no longer caches the default settings for an hour.

### Test checklist (on the preview)

- [ ] Existing users stay signed in; the site looks exactly as before (Classic style + your theme).
- [ ] Settings → Appearance: hover themes and styles (live preview), pick one, Save, then reload: everyone sees it.
- [ ] Try the Anime Deluxe → Sakura Spirit theme in light and dark mode.
- [ ] Profile → Appearance: pick a personal theme and style.
- [ ] Profile → Security: turn on two-step sign-in, save the recovery codes, sign out, and sign in with a code.
- [ ] Ctrl/⌘ K: search for a program name.
- [ ] On a phone: bottom tab bar, Menu drawer, Settings sections.

### Rollback

Redeploy the previous Vercel deployment. The new fields are ignored by the old code. Two-step sign-in simply stops being asked for until you redeploy this version.

---

# Update 1

This update adds features on top of the running LMS. **No database migration is needed.** Every new field has a default, and old records, sessions and logins keep working.

## Before you deploy

1. **Rotate the MongoDB password.** It was hardcoded in `lib/db.ts` in the old code. That file now reads only `MONGODB_URI`. Change the password in Atlas and update `MONGODB_URI` in Vercel.
2. **Deploy to a Vercel preview first.** Push to a branch, open the preview URL, run the checklist below, then merge to production.
3. **Install dependencies from the lockfile:** `pnpm install --frozen-lockfile`. Next.js was upgraded to **16.4.3** and zod to **4.6.7** to patch published security advisories (RCE in image optimisation and `use cache`, a server-actions DoS). After the upgrade, `pnpm audit` reports no known vulnerabilities.

## Environment variables (all optional)

| Variable | What it does | Default |
|---|---|---|
| `NEXT_PUBLIC_APP_TIMEZONE` | Time zone used for every date and time shown or entered | `Asia/Karachi` |
| `ROYAL_ADMIN_EMAILS` | Comma-separated emails that are always royal admins (a lockout safety net) | none |
| `AUTH_LIVE_CHECKS` | Set to `off` to disable the per-request live account checks (emergency switch only) | on |
| `CRON_SECRET` | Protects the deadline-reminder cron. **Recommended.** | none |
| `NEXT_PUBLIC_APP_URL` | Public site URL, used in emails and certificate verification links | request host |

## What's new

**Security & admin**
- **Royal admins** are the only ones who can create, edit or delete admins, view security logs, revoke sessions, and turn on maintenance mode. **Bootstrap:** while no royal admin exists, every admin is treated as royal. The first one should open *Users → Security* and click **Claim royal**.
- **Security dashboard** (`/admin/security`) shows signed audit logs with filters and an integrity check that marks each entry valid, unsigned or tampered. Logs export to CSV. It also has the "sign out everyone" emergency button.
- **Audit events** now cover sign-in and sign-out, password changes, access denials, users, settings, programs, sessions, assignments, grades, quizzes and certificates.
- **Revoking sessions:** a disabled, deleted or demoted user is signed out on their next request.
- **Security headers:** HSTS, CSP (`frame-ancestors`, `object-src`, `base-uri`, `form-action`), Permissions-Policy, COOP and a stricter Referrer-Policy.
- **Uploads:** Cloudinary uploads are rate-limited and locked to the organisation's folder.
- **Password changes:** changing your password on the Profile page now signs you out everywhere, including the current browser. You sign in again with the new password, and the login page explains why.

**Time fix.** Vercel's servers run in UTC, so a 7 pm session used to show as 2 pm. All dates and times now display and save in `NEXT_PUBLIC_APP_TIMEZONE`, whatever the server's or browser's time zone.

**Themes**
- 124 colour themes in 11 categories, including Pakistan and High Contrast. Every theme passes WCAG contrast checks.
- The picker has search and category filters, with a live preview.
- Optional **personal themes**: users choose their own on the Profile page. Turn this on in *Settings → Theme*.

**Quizzes** (`/quizzes`, plus links on each program and session page)
- Question types: single choice, multiple choice, true/false, short answer, numeric (with tolerance), and long answer (graded by hand).
- Options: time limit, attempt limit, open and close dates, shuffled questions and options, pass mark, and when to show results and correct answers.
- Integrity: answers are never sent to the browser before results are allowed. The timer is enforced on the server, answers autosave, and a timed-out attempt is submitted automatically.
- Results: per-attempt review, manual grading with feedback, attempt reset, and CSV export.

**Programs** (`/programs`)
- **Program pages** for students and mentors: progress rings, a syllabus timeline, sessions, assignments, quizzes and the student's certificate.
- **Syllabus editor:** overview, learning outcomes, prerequisites, assessment, and modules with weeks, topics, linked sessions and resources.
- **Gradebook:** attendance, assignment and quiz percentages for every student, with CSV export.
  - Late or missing work is marked.
  - Missing assignments past their due date count as 0.
  - Quizzes that closed without an attempt count as 0.

**Certificates**
- Three print-ready A4 designs (Classic, Modern, Elegant), configured per program with a live preview, signatory and signature image.
- Minimum attendance, assignment and quiz percentages to qualify.
- An eligibility table that shows the reason each student doesn't qualify yet.
- Issue options: selected students, all eligible students, or ignoring the rules. Students get a notification and an optional email.
- Revoking requires a reason. Each certificate has a unique number (`PREFIX-YYYY-XXXX-XXXX`).
- **Public verification** at `/verify/<number>` needs no sign-in and shows only what is printed on the certificate. Students can copy the link or share it on LinkedIn.

**Settings — new tabs**
- **Features:** turn quizzes, certificates, syllabus, gradebook and queries on or off.
- **Announcement:** a site-wide banner with tone, link and audience.
- **Certificates:** issuer, signatory, prefix and footer.
- **Sign-in & maintenance:** a login-page notice. Maintenance mode is for royal admins only; admins can still use the site while it is on.

## Test checklist (on the preview)

- [ ] Sign in as an existing admin, student and mentor. Old sessions should still work.
- [ ] Session and assignment times match what you entered (Pakistan time).
- [ ] *Users → Security → Claim royal*, then check that a non-royal admin can't open `/admin/security`.
- [ ] Create a quiz with three question types, publish it, take it as a student, and check the result and gradebook.
- [ ] Write a syllabus for a program and view it as a student.
- [ ] Program → Certificates: save a design, issue to one student, open it, print it, and open `/verify/<number>` in a private window.
- [ ] Apply a few themes, and try a personal theme.
- [ ] Turn the announcement banner on and off.

## Rollback

All changes are additive. To roll back, redeploy the previous Vercel deployment. New collections and fields (quizzes, syllabi, certificates, the `royal` flag and so on) are simply ignored by the old code.
