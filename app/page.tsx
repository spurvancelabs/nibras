// =============================================================================
// FILE: app/page.tsx
// Public landing page (route "/").
// Colours / font / radius come from Settings → injected as CSS vars in app/layout.tsx.
// Stats are live counts from MongoDB (Program, User, Session).
// =============================================================================

import Link from 'next/link';
import Image from 'next/image';
import { getSettings } from '@/lib/settings';
import ThemeToggle from '@/components/ThemeToggle';
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

function formatCount(n: number): string {
  if (n < 1000) return n.toLocaleString();
  return (
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
      .format(n)
      .toLowerCase() + '+'
  );
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

  const heroTitle = settings.heroTitle || 'Teach, learn, and track — all in one place.';
  const heroSubtitle =
    settings.heroSubtitle ||
    `${settings.orgName} runs every program on a single platform for sessions, assignments, materials, mentor–student conversations, and attendance.`;
  const statItems = showStats
    ? [
        { value: formatCount(stats.students), label: 'Active students', icon: <SmileIcon /> },
        { value: formatCount(stats.programs), label: 'Active programs', icon: <AwardIcon /> },
        { value: formatCount(stats.sessions), label: 'Sessions held', icon: <VideoIcon /> },
        { value: formatCount(stats.mentors), label: 'Mentors', icon: <HeadsetIcon /> },
      ]
    : [
        { value: 'Live', label: 'Sessions & recordings', icon: <VideoIcon /> },
        { value: 'Graded', label: 'Assignments & feedback', icon: <AwardIcon /> },
        { value: 'Tracked', label: 'Attendance', icon: <SmileIcon /> },
        { value: '1:1', label: 'Mentor support', icon: <HeadsetIcon /> },
      ];

  return (
    // Colours, radius and font come from Settings via app/layout.tsx (CSS variables).
    <div className="min-h-screen bg-bg text-text antialiased">

      {/* ==================================================================
          Header
      ================================================================== */}
      <header className="sticky top-0 z-30 bg-hero border-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 sm:min-h-20 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            {settings.logo ? (
              <Image
                src={settings.logo}
                alt={settings.orgName}
                width={320}
                height={80}
                priority
                className="brand-logo"
              />
            ) : (
              <>
                <LogoMark />
                <span className="font-semibold text-[15px] truncate">
                  {settings.orgName}
                </span>
              </>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-sm">
            <a href="#features" className="text-text/80 hover:text-text transition">
              Features
            </a>
            <a href="#how" className="text-text/80 hover:text-text transition">
              How it works
            </a>
            {settings.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="text-text/80 hover:text-text transition"
              >
                Contact
              </a>
            )}
          </nav>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {settings.supportUrl && (
              <a
                href={settings.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline text-sm font-medium hover:opacity-70 transition"
              >
                Support
              </a>
            )}
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 h-10 sm:h-11 px-4 sm:px-6 text-sm font-medium border border-primary text-text hover:bg-primary hover:text-primary-fg transition rounded-[var(--radius-md)]"
            >
              <LoginIcon />
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* ==================================================================
          Hero
      ================================================================== */}
      <section className="relative overflow-hidden bg-hero">
        <Dots className="hidden lg:block absolute right-[6%] top-8 w-28 h-24" />
        <Dots className="hidden lg:block absolute left-[3%] bottom-24 w-24 h-28" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-28 sm:pb-32 grid lg:grid-cols-2 gap-12 lg:gap-6 items-center">
          {/* Copy */}
          <div className="max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.15] tracking-tight">
              {heroTitle}
            </h1>

            <p className="mt-6 text-[15px] text-muted leading-relaxed max-w-md">
              {heroSubtitle}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-5">
              <Link
                href={ctaHref}
                className="inline-flex items-center h-12 px-7 text-sm font-medium bg-primary text-primary-fg hover:opacity-90 transition rounded-[var(--radius-md)]"
              >
                {ctaLabel}
              </Link>

              {stats.students > 0 ? (
                <div className="flex items-center gap-3">
                  <AvatarStack />
                  <div className="leading-tight">
                    <p className="text-2xl font-medium tabular-nums">
                      {formatCount(stats.students)}
                    </p>
                    <p className="text-xs text-muted">active learners</p>
                  </div>
                </div>
              ) : (
                <a href="#features" className="text-sm font-medium underline underline-offset-4 hover:opacity-70">
                  See features
                </a>
              )}
            </div>

            <p className="mt-6 text-xs text-muted">
              Accounts are issued by your admin — no self-signup.
            </p>
          </div>

          {/* Visual */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none flex justify-center">
            {/* Paint splash */}
            <svg
              aria-hidden
              viewBox="0 0 400 400"
              className="absolute inset-0 m-auto w-[88%] h-[88%] text-accent"
            >
              <path
                fill="currentColor"
                d="M83 92c39-50 120-71 182-52 54 17 104 64 109 126 5 55-28 98-37 152-8 47-58 70-108 60-41-8-55-48-96-58C83 309 34 290 26 238c-6-42 25-60 31-98 4-21 11-31 26-48Z"
              />
            </svg>

            {/* Dashed arrow */}
            <svg
              aria-hidden
              viewBox="0 0 120 50"
              className="hidden sm:block absolute -left-4 lg:-left-16 top-4 w-28 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <path d="M4 22c30-18 70-20 104 6" strokeDasharray="4 5" />
              <path d="M100 18l9 10-12 3" />
            </svg>

            <div className="relative z-10 w-full max-w-[420px]">
              {settings.heroImage ? (
                <Image
                  src={settings.heroImage}
                  alt=""
                  width={560}
                  height={640}
                  priority
                  className="w-full h-auto object-contain drop-shadow-xl"
                />
              ) : (
                <CoursePreview orgName={settings.orgName} />
              )}
            </div>

            {/* Floating play */}
            <span
              aria-hidden
              className="absolute z-20 left-[4%] top-[22%] grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface/80 backdrop-blur shadow-lg"
            >
              <span className="grid place-items-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-hero">
                <svg width="16" height="16" viewBox="0 0 24 24" className="text-text ml-0.5" fill="currentColor">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
              </span>
            </span>

            {/* Floating lesson card */}
            <div
              aria-hidden
              className="absolute z-20 right-0 sm:-right-2 bottom-[10%] w-28 sm:w-36 p-3 sm:p-4 bg-surface/70 backdrop-blur-md border border-surface shadow-xl rounded-[var(--radius-md)]"
            >
              <div className="flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-text shrink-0">
                  <path d="M6 3v18l15-9z" />
                </svg>
                <span className="h-1 flex-1 rounded-full bg-text/70" />
              </div>
              <span className="mt-2.5 block h-1 rounded-full bg-text/70" />
              <span className="mt-2.5 block h-1 w-3/4 rounded-full bg-text/70" />
              <span className="mt-2.5 block h-1 w-1/2 rounded-full bg-text/70" />
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
          Stats bar (overlaps hero edge)
      ================================================================== */}
      <section aria-label={showStats ? 'Platform statistics' : 'Highlights'} className="relative z-10 -mt-14 sm:-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 px-5 sm:px-10 py-6 sm:py-7 bg-surface/90 backdrop-blur border border-border shadow-[0_20px_50px_-24px_rgba(0,0,0,0.25)] rounded-[var(--radius-lg)]">
            {statItems.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} icon={s.icon} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================================
          Trusted by (from settings)
      ================================================================== */}
      {settings.partnerLogos.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <h2 className="text-2xl font-medium">{settings.partnersTitle || 'Trusted by'}</h2>
            {settings.partnersText && (
              <p className="text-sm text-muted leading-relaxed max-w-sm">
                {settings.partnersText}
              </p>
            )}
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-8 items-center">
            {settings.partnerLogos.map((src, i) => (
              <div key={src + i} className="flex justify-center">
                <Image
                  src={src}
                  alt=""
                  width={140}
                  height={48}
                  className="h-10 w-auto object-contain grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition dark:invert"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================================
          Features
      ================================================================== */}
      <section id="features" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Features</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Everything your program needs
            </h2>
          </div>
          <p className="text-sm text-muted leading-relaxed max-w-sm">
            Built around how mentors actually run sessions and how students
            actually learn — not a generic workspace bolted onto a spreadsheet.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group p-6 bg-surface border border-border hover:border-primary hover:-translate-y-0.5 transition rounded-[var(--radius-lg)]"
            >
              <div className="w-11 h-11 grid place-items-center bg-hero text-text group-hover:bg-primary group-hover:text-primary-fg transition rounded-[var(--radius-md)]">
                {f.icon}
              </div>
              <h3 className="mt-5 font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================================
          How it works — one card per role
      ================================================================== */}
      <section id="how" className="scroll-mt-20 relative overflow-hidden bg-hero">
        <Dots className="hidden md:block absolute right-[4%] top-10 w-24 h-20" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">How it works</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Built for three roles
            </h2>
            <p className="mt-3 text-muted leading-relaxed">
              Admins set it up. Mentors run it. Students learn in it. Everyone
              sees exactly what they need.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {ROLES.map((r, i) => (
              <div
                key={r.role}
                className={`p-7 border rounded-[var(--radius-lg)] ${
                  i === 1
                    ? 'bg-primary text-primary-fg border-primary'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{r.label}</h3>
                  <span className={`text-xs tabular-nums ${i === 1 ? 'opacity-70' : 'text-muted'}`}>
                    0{i + 1}
                  </span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {r.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span
                        className={`mt-0.5 grid place-items-center w-5 h-5 rounded-full shrink-0 ${
                          i === 1 ? 'bg-primary-fg text-primary' : 'bg-hero text-text'
                        }`}
                      >
                        <CheckIcon />
                      </span>
                      <span className={i === 1 ? 'opacity-90' : 'text-muted'}>{b}</span>
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="relative overflow-hidden bg-primary text-primary-fg px-6 py-12 sm:px-14 sm:py-16 rounded-[var(--radius-lg)]">
          <span
            aria-hidden
            className="absolute -right-16 -bottom-24 w-72 h-72 rounded-full bg-hero opacity-15"
          />
          <span
            aria-hidden
            className="absolute -left-10 -top-16 w-40 h-40 rounded-full bg-accent opacity-15"
          />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
                Ready to get started?
              </h2>
              <p className="mt-3 opacity-75">
                Sign in with the credentials your admin provided, or reach out to
                get set up.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={ctaHref}
                className="inline-flex items-center h-12 px-7 text-sm font-medium bg-hero text-text hover:opacity-90 transition rounded-[var(--radius-md)]"
              >
                {ctaLabel}
              </Link>
              {settings.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="inline-flex items-center h-12 px-7 text-sm font-medium border border-primary-fg/40 hover:border-primary-fg transition rounded-[var(--radius-md)]"
                >
                  Contact us
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
          Footer
      ================================================================== */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2.5">
            {!settings.logo && <LogoMark small />}
            <p>
              © {year} {settings.orgName}. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
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

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 lg:justify-center">
      <span className="text-text shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-medium tabular-nums leading-tight">{value}</p>
        <p className="mt-0.5 text-xs sm:text-[13px] text-muted truncate">{label}</p>
      </div>
    </div>
  );
}

function LogoMark({ small = false }: { small?: boolean }) {
  const s = small ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <span aria-hidden className="flex items-center">
      <span className={`${s} rounded-full bg-primary`} />
      <span className={`${s} -ml-1.5 rounded-full border-2 border-primary bg-hero`} />
    </span>
  );
}

function Dots({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none text-muted opacity-50 bg-[radial-gradient(currentColor_1.3px,transparent_1.5px)] [background-size:18px_18px] ${className}`}
    />
  );
}

function AvatarStack() {
  const tones = [
    'bg-accent text-text',
    'bg-primary text-primary-fg',
    'bg-surface text-text',
    'bg-accent text-text',
  ];
  return (
    <div aria-hidden className="flex -space-x-3">
      {tones.map((t, i) => (
        <span
          key={i}
          className={`grid place-items-center w-10 h-10 rounded-full ring-2 ring-hero ${t}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
            <circle cx="12" cy="8.5" r="4" />
            <path d="M4 20.5c.8-4 4-6 8-6s7.2 2 8 6z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/** Shown when no hero image is set in settings. */
function CoursePreview({ orgName }: { orgName: string }) {
  return (
    <div className="mx-auto w-[86%] p-3 bg-surface border border-border shadow-2xl rotate-[-2deg] rounded-[var(--radius-lg)]">
      <div className="relative aspect-[4/3] grid place-items-center overflow-hidden bg-hero rounded-[var(--radius-md)]">
        <svg viewBox="0 0 120 90" className="w-2/3 text-text" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
          <path d="M60 18 108 38 60 58 12 38z" fill="currentColor" />
          <path d="M32 47v18c8 8 20 12 28 12s20-4 28-12V47" />
          <path d="M100 41v22" />
          <circle cx="100" cy="66" r="3.5" fill="currentColor" />
        </svg>
      </div>
      <div className="px-2 pt-4 pb-2">
        <p className="text-xs text-muted">{orgName} · Program</p>
        <p className="mt-1 font-medium">Session 04 — Recording</p>
        <div className="mt-3 h-1.5 rounded-full bg-hero overflow-hidden">
          <span className="block h-full w-2/3 rounded-full bg-primary" />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>Progress</span>
          <span className="tabular-nums">66%</span>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const iconProps = {
  width: 30,
  height: 30,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function SmileIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 14.5c1 1.4 2.4 2 4 2s3-.6 4-2" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.2" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="9" r="6" />
      <circle cx="12" cy="9" r="3" />
      <path d="M8.5 14 7 22l5-3 5 3-1.5-8" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M19 19c0 1.5-2 2.5-5 2.5" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
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