# Update 4 — report

What was built, how it was checked, the assumptions made, and what's still open.

## 1. Speed and smoothness

- **Colour changes fade** instead of snapping:
  - Light/dark switching uses the browser's View Transition (a 380 ms cross-fade) where it's supported, and a short colour transition elsewhere.
  - Changing your personal theme in Profile → Appearance fades the same way.
  - Turned off for people who ask for reduced motion.
- **Lighter transitions:** controls used to animate `all` properties, which made layout changes stutter. They now animate only colour, border, shadow, opacity and transform. Page-enter animation is shorter (0.32 s).
- **Less JavaScript up front:** the command palette (Ctrl/⌘K) loads only the first time it's opened.
- **Faster dashboard:**
  - Learner progress and mentor grading counts are cached for 30–45 s per person and refreshed when something changes.
  - Admin user numbers are counted in the database instead of loading every user.
- **New database indexes** for the busiest lists (submissions per assignment/learner, attendance per learner).

## 2. Registration (Super Admin setting)

- **Off by default.** When on, the login page shows "Create an account" and `/register` opens.
- **Modes:**
  - **Needs approval** (default): accounts wait in Users → *Awaiting approval*, and admins are notified.
  - **Open:** active immediately.
- **Optional rules:** allowed email domains, auto-join a program, and a welcome message.
- **Email confirmation** happens when email sending is set up. The link is single-use, expires after 24 h, and is used when the button is pressed, not when the page opens (so email scanners can't use it up).
- **Protection:**
  - learner role only
  - password policy enforced
  - honeypot field against bots
  - limits of 8 sign-ups per hour per network and 3 tries per day per email
  - with email confirmation on, the same answer whether or not an email already exists, so nobody can probe which emails have accounts. Without email sending, the form says an account "may already exist" and points to Forgot password.
- Pending accounts get a clear "not active yet" message at sign-in.

## 3. Token currency (fully customisable)

- **Super Admin decides:** on/off, the name and icon, the amount for each action, the daily earning cap, whether people can send tokens (and the daily limit), and whether the leaderboard is shown.
- **Earned automatically for:**
  - attendance (present or late, counted once per session)
  - on-time or late work (counted once per assignment)
  - grades of 90% or more
  - passing a quiz, plus a perfect-score bonus
  - finishing lessons and courses
  - a weekly attendance streak (paid by the Monday daily job)
- **Spent on:** Premium plans, locked sessions and courses.
- **Wallet page:** balance, ways to earn, history, send (if allowed) and leaderboard. The top bar shows the balance.
- **Admin → Tokens:** totals, the full ledger, and grant/remove for one person or many. Large changes ask for your password, and every change is audited.
- **Ledger safety:**
  - every change is a ledger entry with a unique key, so the same reward or purchase can't happen twice
  - spending only succeeds if the balance covers it (no overdraft, even with double clicks)
  - a failed purchase is refunded automatically

## 4. Premium management

- **Plans:** admins create plans (days or lifetime, price in tokens, active/hidden). Learners buy them on the Premium page, and the purchase extends their membership. This sits alongside admin grants and codes.
- **Premium or paid sessions:** each session can be Free, Premium-only, or unlocked once with tokens. Premium members get token sessions free.
  - For locked learners, the server removes the meeting link, recording and materials, and the page shows an unlock panel.
- **Courses** use the same Free / Premium / tokens choice (see 5).
- **Fixed — security:** a learner could open the page of a session in a program they don't belong to by guessing its address. Session pages now check program membership.

## 5. Video courses (pre-recorded lectures)

- **Catalog** (`/courses`): search, level and price filters, "Continue learning", and "Completed".
  - Learners see published courses meant for everyone or for their programs.
- **Course page:** description, instructors, curriculum (free-preview lessons marked, others locked), progress, and an enrol button.
  - Free courses: enrol for free.
  - Premium courses: Premium members only.
  - Token courses: pay once (Premium members free).
  - If a payment went through but enrolling failed, the person can enrol again without being charged twice.
- **Lesson player:**
  - YouTube (privacy-enhanced) and Vimeo are embedded. Uploaded videos play in the built-in player with speed control (0.75×–2×) and resume where you left off.
  - Each lesson has an explanation with simple formatting, downloadable resources, and an outline sidebar.
  - Mark complete / Next. A video watched to the end completes itself.
  - Tokens for lessons and for finishing the course, and a "course finished" notification.
- **Course builder** (`/admin/courses`):
  - Course settings: details, cover image, level, category, web address, access and price, audience programs, instructors.
  - Content: sections and lessons with reorder and move-between-sections.
  - Lesson editor: video upload in 20 MB chunks with progress and cancel (long recordings work), YouTube/Vimeo links, length, explanation with live preview, file and link resources, and the free-preview switch.
  - Learners tab: who joined, how, and their progress.
  - Save draft / Publish / Unpublish. Unsaved changes are kept and the browser warns before you leave.
  - A course with learners is **archived instead of deleted**, so paid learners keep access.
- **Safety:**
  - Videos, explanations and resources are only sent to enrolled learners, course staff, or for preview lessons.
  - Explanations are shown as plain text with formatting (no HTML, so no script injection).
  - Video links must be https YouTube/Vimeo/uploaded files, and resources must be http(s).
  - Mentors (when allowed) can only edit their own courses and target programs they teach.

## 6. AI grading reads attachments, and grading reports

- **The AI now reads:**
  - PDFs (first 40 pages)
  - Word, PowerPoint (including speaker notes), Excel and OpenDocument files
  - Jupyter notebooks, code and text files
  - With `AI_VISION=on` and a vision model: photos and screenshots, and scanned PDFs (sent as page images)
- **"What the AI read"** on the review screen lists every attachment and whether it was read. If something couldn't be read, the confidence is lowered and the suggestion is flagged.
- **Safety:**
  - Only files in your own Cloudinary account are fetched, and redirects are refused, so the server can't be pointed elsewhere.
  - Size limits, oversized "zip bomb" documents refused, at most 6 files and 4 images.
  - A time budget keeps every call inside Vercel's 10 s limit.
  - File content stays untrusted data for the AI, with the existing prompt-injection defences.
- **Grading report** for each assignment (Grading → choose an assignment → Report):
  - submitted / graded / late / missing
  - average, median, pass rate, highest/lowest/spread
  - grade bands
  - rubric averages
  - how close AI suggestions were to final grades (within 10%, average gap, % edited)
  - what the AI flagged
  - who hasn't submitted
  - a table of every learner
  - **CSV download** (protected against spreadsheet formulas, staff only, audited)

## 7. How it was checked

- **TypeScript:** no errors. **Unit tests:** 35 passing (9 new). The new tests cover token caps, video-link checks, safe lesson formatting, Word/PowerPoint/Excel/notebook reading, zip-bomb refusal, report statistics, CSV safety, and menu opt-in.
- **Production build** (`next build`): passes.
- **Real files:** Word, PowerPoint, Excel and PDF files were generated and read correctly.
- **Browser tests on the production build (desktop and phone):**
  - Admin created and published three courses (free, token-priced, Premium) through the builder.
  - A learner with 100 tokens enrolled in the 30-token course, watched, completed both lessons, and finished the course. The final balance was 124, exactly right: 100 − 30 + 2 + 2 + 50.
  - A Premium member enrols in the token course for free.
  - A learner with no tokens can't enrol, sees preview lessons, and is blocked from locked lessons.
  - Premium course upsell, and the Learners tab in the builder.
  - Grading report and CSV as a mentor. A learner gets 403 on the CSV.
  - Registration (approval mode), and the pending-account message at sign-in.
- **All-roles page sweep:** no errors on any new page. The only failures were two existing pages (Users, Security) that use database features the local test database (FerretDB) doesn't have. They work on MongoDB Atlas and weren't changed in this update.

## 8. Assumptions and limits

- **There's no card payment.** Tokens are earned or granted, and Premium comes from grants, codes or token plans. Tokens have no cash value.
- People who register are always learners. Staff accounts are still created by admins.
- **YouTube/Vimeo videos** can't report "watched to the end", so learners press *Mark as complete*. Uploaded videos complete automatically.
- **Video size:** your Cloudinary plan limits upload size (100 MB per video on the free plan). Use YouTube (unlisted) or Vimeo for longer lectures. Uploaded videos are hidden from people who aren't enrolled, but someone who is enrolled could share the file link. Use private YouTube/Vimeo settings for sensitive content.
- **Image reading** needs a vision-capable model and `AI_VISION=on`. Without it, images are listed as "not read" and the mentor checks them.

## 9. Still to do / ideas

- Card payments (e.g. a local gateway) if you want to sell Premium or courses for money.
- Course certificates (reuse the certificate system), quizzes inside courses, and course reviews.
- Signed (expiring) video links for uploaded videos, which needs Cloudinary's authenticated delivery.
