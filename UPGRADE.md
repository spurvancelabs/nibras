# Nibras LMS — upgrade notes

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
