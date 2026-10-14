import Link from 'next/link';
import Image from 'next/image';
import { getSettings } from '@/lib/settings';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Public stats — counts only, no PII, safe to render for anyone.
// ---------------------------------------------------------------------------

type PublicStats = {
  programs: number;
  mentors: number;
  students: number;
};

async function getPublicStats(): Promise<PublicStats> {
  try {
    await db();
    const [programs, mentors, students] = await Promise.all([
      Program.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'mentor', status: 'active' }),
      User.countDocuments({ role: 'student', status: 'active' }),
    ]);
    return { programs, mentors, students };
  } catch {
    return { programs: 0, mentors: 0, students: 0 };
  }
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

export default async function LandingPage() {
  const [settings, session, stats] = await Promise.all([
    getSettings(),
    auth(),
    getPublicStats(),
  ]);

  const isLoggedIn = !!session?.user;
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {settings.logo ? (
              <Image
                src={settings.logo}
                alt={settings.orgName}
                width={140}
                height={28}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <span className="font-semibold">{settings.orgName}</span>
            )}
          </Link>

          <nav className="hidden sm:flex items-center gap-5 text-sm">
            <a href="#features" className="text-muted hover:text-text transition">
              Features
            </a>
            <a href="#how" className="text-muted hover:text-text transition">
              How it works
            </a>
            {settings.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="text-muted hover:text-text transition"
              >
                Contact
              </a>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary text-sm">
                Open dashboard
              </Link>
            ) : (
              <Link href="/login" className="btn-primary text-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
            Learning Management System
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
            Learn, teach, and track — <br className="hidden sm:block" />
            all in one place.
          </h1>

          <p className="mt-5 text-lg text-muted leading-relaxed">
            {settings.orgName} runs its programs on a single platform for
            sessions, assignments, materials, and mentor–student conversations.
            No spreadsheets. No scattered links.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={isLoggedIn ? '/dashboard' : '/login'} className="btn-primary">
              {isLoggedIn ? 'Open dashboard' : 'Sign in to your account'}
            </Link>
            <a href="#features" className="btn-outline">
              See features
            </a>
          </div>

          <p className="mt-4 text-xs text-muted">
            Accounts are issued by your admin — no self-signup.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Stats                                                            */}
      {/* ---------------------------------------------------------------- */}
      {stats.programs + stats.mentors + stats.students > 0 && (
        <section className="border-y border-border bg-surface">
          <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-3 gap-6 text-center">
            <Stat value={stats.programs} label="Active programs" />
            <Stat value={stats.mentors} label="Mentors" />
            <Stat value={stats.students} label="Students" />
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything a program needs
          </h2>
          <p className="mt-3 text-muted">
            Built around the way mentors actually run sessions and the way
            students actually learn.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card hover:border-[var(--color-primary)] transition"
            >
              <div className="w-9 h-9 rounded-md bg-bg border border-border flex items-center justify-center text-[var(--color-primary)] mb-3">
                {f.icon}
              </div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="how" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted">
              Set up once. Run everything from one place.
            </p>
          </div>

          <ol className="mt-10 grid sm:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="font-medium">{s.title}</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {s.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="card bg-surface p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-muted max-w-xl mx-auto">
            Sign in with the credentials your admin provided, or reach out to
            get set up.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href={isLoggedIn ? '/dashboard' : '/login'}
              className="btn-primary"
            >
              {isLoggedIn ? 'Open dashboard' : 'Sign in'}
            </Link>
            {settings.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="btn-outline"
              >
                Contact us
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
          <p>
            © {year} {settings.orgName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {settings.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="hover:text-text transition"
              >
                {settings.contactEmail}
              </a>
            )}
            {settings.supportUrl && (
              <a
                href={settings.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition"
              >
                Support
              </a>
            )}
            <Link href="/login" className="hover:text-text transition">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-3xl sm:text-4xl font-bold tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-xs uppercase tracking-wide text-muted mt-1">
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const FEATURES: { title: string; description: string; icon: React.ReactNode }[] = [
  {
    title: 'Sessions & recordings',
    description:
      'Schedule sessions with agendas, meeting links, and YouTube recordings students can revisit any time.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: 'Assignments & grading',
    description:
      'Create assignments with deadlines and reference files. Students submit, mentors grade with marks and feedback.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    title: 'Materials & slides',
    description:
      'Upload PDFs, slides, and links to any session. Students download or open directly in the browser.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    title: 'Mentor–student queries',
    description:
      'Threaded Q&A tied to sessions or programs. First mentor to reply becomes the assigned mentor.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: 'Attendance tracking',
    description:
      'Mark students present, absent, late, or excused per session. Students see their own rate and history.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    title: 'Notifications & reminders',
    description:
      'In-app bell plus email alerts for new assignments, graded work, query replies, and deadlines.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ),
  },
  {
    title: 'Role-based access',
    description:
      'Admins, mentors, and students each see only what they need. Permissions enforced on every action.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Customizable theme',
    description:
      'Admins change logo, colors, and typography. Everything updates instantly across the platform.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    title: 'Live dashboards',
    description:
      'Students see pending work at a glance. Mentors see what needs grading. Admins see the whole picture.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
];

const STEPS: { title: string; description: string }[] = [
  {
    title: 'Set up your programs',
    description:
      'Admins create programs, invite mentors, and enroll students. Everything is organized by program.',
  },
  {
    title: 'Run sessions and share work',
    description:
      'Mentors schedule sessions, upload slides and recordings, and create assignments with clear deadlines.',
  },
  {
    title: 'Learn and track progress',
    description:
      'Students submit work, ask questions, mark attendance, and watch their progress build over time.',
  },
];