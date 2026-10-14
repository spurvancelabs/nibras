import Link from 'next/link';
import Image from 'next/image';
import { getSettings } from '@/lib/settings';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Program from '@/models/Program';
import User from '@/models/User';
import Session from '@/models/Session';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Live stats — counts only, no PII.
// ---------------------------------------------------------------------------

type Stats = {
  programs: number;
  mentors: number;
  students: number;
  sessions: number;
};

async function getStats(): Promise<Stats> {
  const empty: Stats = { programs: 0, mentors: 0, students: 0, sessions: 0 };
  try {
    await db();
    const [programs, mentors, students, sessions] = await Promise.all([
      Program.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'mentor', status: 'active' }),
      User.countDocuments({ role: 'student', status: 'active' }),
      Session.countDocuments({}),
    ]);
    return { programs, mentors, students, sessions };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LandingPage() {
  const [settings, sessionRaw, stats] = await Promise.all([
    getSettings(),
    auth(),
    getStats(),
  ]);

  const session = sessionRaw as { user?: { name?: string } } | null;
  const isLoggedIn = !!session?.user;
  const year = new Date().getFullYear();
  const ctaHref = isLoggedIn ? '/dashboard' : '/login';
  const ctaLabel = isLoggedIn ? 'Open dashboard' : 'Sign in';
  const showStats = stats.programs + stats.mentors + stats.students > 0;

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ==================================================================
          Header
      ================================================================== */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            {settings.logo ? (
              <Image
                src={settings.logo}
                alt={settings.orgName}
                width={140}
                height={28}
                className="h-7 w-auto object-contain"
              />
            ) : (
              <span className="font-semibold truncate">
                {settings.orgName}
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a
              href="#features"
              className="text-muted hover:text-text transition"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-muted hover:text-text transition"
            >
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

          <Link href={ctaHref} className="btn-primary text-sm shrink-0">
            {ctaLabel}
          </Link>
        </div>
      </header>

      {/* ==================================================================
          Hero
      ================================================================== */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Learning Management System
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
            Teach, learn, and track —
            <br className="hidden sm:block" />
            all in one place.
          </h1>

          <p className="mt-6 text-lg text-muted leading-relaxed max-w-2xl">
            {settings.orgName} runs every program on a single platform for
            sessions, assignments, materials, mentor–student conversations,
            and attendance.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ctaHref} className="btn-primary">
              {ctaLabel}
            </Link>
            <a href="#features" className="btn-outline">
              See features
            </a>
          </div>

          <p className="mt-5 text-xs text-muted">
            Accounts are issued by your admin — no self-signup.
          </p>
        </div>
      </section>

      {/* ==================================================================
          Stats
      ================================================================== */}
      {showStats && (
        <section className="border-y border-border bg-surface">
          <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Stat value={stats.programs} label="Active programs" />
            <Stat value={stats.mentors} label="Mentors" />
            <Stat value={stats.students} label="Students" />
            <Stat value={stats.sessions} label="Sessions" />
          </div>
        </section>
      )}

      {/* ==================================================================
          Features
      ================================================================== */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything your program needs
          </h2>
          <p className="mt-3 text-muted leading-relaxed">
            Built around how mentors actually run sessions and how students
            actually learn — not a generic workspace bolted onto a spreadsheet.
          </p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card hover:border-primary transition"
            >
              <div className="w-10 h-10 rounded-md bg-bg border border-border flex items-center justify-center text-primary mb-3">
                {f.icon}
              </div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================================
          How it works — one card per role
      ================================================================== */}
      <section id="how" className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Built for three roles
            </h2>
            <p className="mt-3 text-muted leading-relaxed">
              Admins set it up. Mentors run it. Students learn in it. Everyone
              sees exactly what they need.
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {ROLES.map((r) => (
              <div key={r.role} className="card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary text-primary-fg flex items-center justify-center text-xs font-semibold">
                    {r.role[0].toUpperCase()}
                  </div>
                  <h3 className="font-semibold">{r.label}</h3>
                </div>
                <ul className="space-y-2.5 text-sm text-muted">
                  {r.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="text-primary mt-1 shrink-0">
                        <CheckIcon />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================
          CTA
      ================================================================== */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="card p-8 sm:p-12 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-muted max-w-xl mx-auto">
            Sign in with the credentials your admin provided, or reach out to
            get set up.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href={ctaHref} className="btn-primary">
              {ctaLabel}
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

      {/* ==================================================================
          Footer
      ================================================================== */}
      <footer className="border-t border-border bg-surface">
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
    <div className="text-center">
      <p className="text-3xl sm:text-4xl font-bold tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="mt-1.5 text-xs uppercase tracking-wide text-muted">
        {label}
      </p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Static content
// ---------------------------------------------------------------------------

const FEATURES: {
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    title: 'Sessions & recordings',
    description:
      'Schedule sessions with agendas and meeting links. Attach YouTube recordings students can revisit any time.',
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
      'Upload PDFs, slides, and links to any session. Students download or open them directly in the browser.',
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
      'Threaded Q&A tied to sessions or programs. First mentor to reply becomes the assigned mentor for that thread.',
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
      'In-app bell plus email alerts for new assignments, graded work, query replies, and upcoming deadlines.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ),
  },
  {
    title: 'Programs & cohorts',
    description:
      'Organize students and mentors into programs. Sessions, assignments, and threads stay scoped per program.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7l10-5 10 5-10 5L2 7z" />
        <path d="M6 9v6c0 1.5 2.7 3 6 3s6-1.5 6-3V9" />
      </svg>
    ),
  },
  {
    title: 'Bulk user import',
    description:
      'Onboard hundreds of students and mentors at once from a CSV. Auto-assigns them to programs and emails credentials.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    title: 'Custom branding',
    description:
      'Admins change logo, colors, and typography from settings. Every page updates instantly — no rebuild needed.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
      </svg>
    ),
  },
];

const ROLES: {
  role: 'admin' | 'mentor' | 'student';
  label: string;
  bullets: string[];
}[] = [
  {
    role: 'admin',
    label: 'Admin',
    bullets: [
      'Create programs and enroll members',
      'Import users in bulk from CSV',
      'Customize branding and theme',
      'See everything across the org',
    ],
  },
  {
    role: 'mentor',
    label: 'Mentor',
    bullets: [
      'Schedule sessions and share materials',
      'Create assignments with deadlines',
      'Grade submissions with feedback',
      'Answer student questions in threads',
    ],
  },
  {
    role: 'student',
    label: 'Student',
    bullets: [
      'Join sessions and rewatch recordings',
      'Submit assignments and see grades',
      'Ask mentors questions any time',
      'Track your own attendance rate',
    ],
  },
];