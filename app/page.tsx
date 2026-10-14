import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Program from "@/models/Program";
import User from "@/models/User";

export const dynamic = "force-dynamic";

type PublicStats = {
  programs: number;
  mentors: number;
  students: number;
};

type AnySettings = Record<string, unknown> & {
  orgName?: string;
  logo?: string;
  contactEmail?: string;
  supportUrl?: string;
};

const DEFAULTS = {
  orgName: "Your Organization",
  tagline: "One workspace. Every program. Clear progress.",
  description:
    "Bring your people, programs, learning, resources, and operations together in one organized workspace.",
  eyebrow: "ORGANIZATION WORKSPACE",
  primary: "#2563eb",
  primaryForeground: "#ffffff",
  accent: "#14b8a6",
  page: "#f6f8fc",
  surface: "#ffffff",
  text: "#101828",
  muted: "#667085",
  border: "#e4e7ec",
  heroTitle: "Everything your organization needs. In one place.",
  heroDescription:
    "Manage programs, coordinate teams, share resources, and follow progress from a platform that adapts to the way your organization works.",
  signInLabel: "Sign in",
  dashboardLabel: "Open workspace",
  featuresTitle: "A connected workspace for your organization",
  featuresDescription:
    "A flexible foundation for day-to-day operations, with tools that work together instead of living in separate places.",
  stepsTitle: "From setup to progress",
  ctaTitle: "Bring your organization into one workspace",
  ctaDescription:
    "Sign in with the credentials provided by your administrator, or contact your organization to get access.",
  footerText: "A connected workspace for people and programs.",
};

const DEFAULT_FEATURES = [
  {
    title: "Programs & initiatives",
    description:
      "Keep programs, cohorts, participants, and activities organized in one place.",
    icon: "◫",
  },
  {
    title: "People & permissions",
    description:
      "Give administrators, mentors, team members, and participants access appropriate to their roles.",
    icon: "◎",
  },
  {
    title: "Sessions & events",
    description:
      "Coordinate schedules, agendas, meeting links, and recordings without scattered information.",
    icon: "◷",
  },
  {
    title: "Tasks & submissions",
    description:
      "Publish work, set due dates, collect submissions, and keep feedback connected to the task.",
    icon: "↗",
  },
  {
    title: "Resources & knowledge",
    description:
      "Make documents, learning materials, links, and shared references easy to find.",
    icon: "▤",
  },
  {
    title: "Progress & reporting",
    description:
      "Turn activity into a clearer picture of participation, completion, and progress.",
    icon: "⌁",
  },
];

const DEFAULT_STEPS = [
  {
    number: "01",
    title: "Configure your workspace",
    description:
      "Set your organization identity, preferences, roles, and the modules you need.",
  },
  {
    number: "02",
    title: "Bring your people together",
    description:
      "Create programs, invite your team, and give each person the right level of access.",
  },
  {
    number: "03",
    title: "Coordinate and improve",
    description:
      "Run activities, share resources, track progress, and refine your workflow over time.",
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function colorValue(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  // Accept CSS hex, rgb/hsl, and named colors; reject arbitrary CSS fragments.
  if (
    /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(candidate) ||
    /^(?:rgb|rgba|hsl|hsla)\([\d\s.,%+-]+\)$/i.test(candidate) ||
    /^[a-z]{3,20}$/i.test(candidate)
  ) {
    return candidate;
  }
  return fallback;
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? candidate
      : null;
  } catch {
    return null;
  }
}

function safeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function safeArray<T>(
  value: unknown,
  fallback: T[],
  mapper: (item: unknown, index: number) => T | null,
): T[] {
  if (!Array.isArray(value)) return fallback;
  const mapped = value.map(mapper).filter((item): item is T => item !== null);
  return mapped.length ? mapped : fallback;
}

async function getPublicStats(): Promise<PublicStats> {
  const fallback = { programs: 0, mentors: 0, students: 0 };
  try {
    await db();
    const [programs, mentors, students] = await Promise.all([
      Program.countDocuments({ status: "active" }).catch(() => 0),
      User.countDocuments({ role: "mentor", status: "active" }).catch(() => 0),
      User.countDocuments({ role: "student", status: "active" }).catch(() => 0),
    ]);
    return {
      programs: Number.isFinite(programs) ? programs : 0,
      mentors: Number.isFinite(mentors) ? mentors : 0,
      students: Number.isFinite(students) ? students : 0,
    };
  } catch {
    return fallback;
  }
}

async function getSafeSettings(): Promise<AnySettings> {
  try {
    const settings = await getSettings();
    return asRecord(settings) as AnySettings;
  } catch {
    return {};
  }
}

async function getSafeSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}

function Stat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-0 px-3 py-4 sm:px-6">
      <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {value.toLocaleString()}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </div>
    </div>
  );
}

function BrandMark({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-[var(--primary-fg)] shadow-sm"
    >
      {initials || "O"}
    </span>
  );
}

export default async function LandingPage() {
  // Each dependency is isolated: a settings or auth outage should not take down
  // the public landing page.
  const [settings, session, stats] = await Promise.all([
    getSafeSettings(),
    getSafeSession(),
    getPublicStats(),
  ]);

  const theme = asRecord(settings.theme);
  const branding = asRecord(settings.branding);
  const landing = asRecord(settings.landingPage ?? settings.landing);
  const featureSettings = landing.features ?? settings.features;
  const stepSettings = landing.steps ?? settings.steps;

  const orgName = stringValue(
    settings.orgName ?? branding.orgName ?? settings.organizationName,
    DEFAULTS.orgName,
  );
  const logo = safeUrl(settings.logo ?? branding.logoUrl ?? settings.logoUrl);
  const email = safeEmail(settings.contactEmail ?? settings.email);
  const supportUrl = safeUrl(settings.supportUrl ?? settings.helpUrl);

  const colors = {
    primary: colorValue(theme.primary ?? theme.primaryColor ?? settings.primaryColor, DEFAULTS.primary),
    primaryFg: colorValue(theme.primaryForeground ?? theme.primaryTextColor, DEFAULTS.primaryForeground),
    accent: colorValue(theme.accent ?? theme.accentColor ?? settings.accentColor, DEFAULTS.accent),
    page: colorValue(theme.background ?? theme.backgroundColor ?? settings.backgroundColor, DEFAULTS.page),
    surface: colorValue(theme.surface ?? theme.surfaceColor, DEFAULTS.surface),
    text: colorValue(theme.text ?? theme.textColor ?? settings.textColor, DEFAULTS.text),
    muted: colorValue(theme.muted ?? theme.mutedColor, DEFAULTS.muted),
    border: colorValue(theme.border ?? theme.borderColor, DEFAULTS.border),
  };

  const title = stringValue(landing.heroTitle ?? landing.title ?? settings.heroTitle, DEFAULTS.heroTitle);
  const heroDescription = stringValue(
    landing.heroDescription ?? landing.description ?? settings.heroDescription,
    DEFAULTS.heroDescription,
  );
  const eyebrow = stringValue(landing.eyebrow ?? settings.tagline, DEFAULTS.eyebrow);
  const featuresTitle = stringValue(landing.featuresTitle, DEFAULTS.featuresTitle);
  const featuresDescription = stringValue(landing.featuresDescription, DEFAULTS.featuresDescription);
  const stepsTitle = stringValue(landing.stepsTitle, DEFAULTS.stepsTitle);
  const ctaTitle = stringValue(landing.ctaTitle, DEFAULTS.ctaTitle);
  const ctaDescription = stringValue(landing.ctaDescription, DEFAULTS.ctaDescription);
  const footerText = stringValue(settings.footerText ?? landing.footerText, DEFAULTS.footerText);

  const features = safeArray(
    featureSettings,
    DEFAULT_FEATURES,
    (item) => {
      const feature = asRecord(item);
      const featureTitle = stringValue(feature.title ?? feature.name, "");
      if (!featureTitle) return null;
      return {
        title: featureTitle,
        description: stringValue(feature.description, "Explore this capability in your workspace."),
        icon: stringValue(feature.icon, "✳"),
      };
    },
  );
  const steps = safeArray(
    stepSettings,
    DEFAULT_STEPS,
    (item, index) => {
      const step = asRecord(item);
      const stepTitle = stringValue(step.title ?? step.name, "");
      if (!stepTitle) return null;
      return {
        number: stringValue(step.number, String(index + 1).padStart(2, "0")),
        title: stepTitle,
        description: stringValue(step.description, "Follow this step to keep your organization moving."),
      };
    },
  );

  const isLoggedIn = Boolean(session?.user);
  const dashboardHref = safeUrl(settings.dashboardUrl) ?? "/dashboard";
  const loginHref = safeUrl(settings.loginUrl) ?? "/login";
  const primaryHref = isLoggedIn ? dashboardHref : loginHref;
  const primaryLabel = isLoggedIn
    ? stringValue(landing.dashboardLabel, DEFAULTS.dashboardLabel)
    : stringValue(landing.signInLabel, DEFAULTS.signInLabel);
  const year = new Date().getFullYear();
  const showStats = stats.programs + stats.mentors + stats.students > 0;
  const style = {
    "--primary": colors.primary,
    "--primary-fg": colors.primaryFg,
    "--accent": colors.accent,
    "--page": colors.page,
    "--surface": colors.surface,
    "--text": colors.text,
    "--muted": colors.muted,
    "--border": colors.border,
  } as React.CSSProperties;

  return (
    <main style={style} className="min-h-screen overflow-hidden bg-[var(--page)] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${orgName} home`}>
            {logo ? (
              // Plain img intentionally supports organization-hosted logos without
              // requiring every customer domain to be added to next.config.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`${orgName} logo`} className="max-h-10 max-w-[180px] object-contain" />
            ) : (
              <BrandMark name={orgName} />
            )}
            <span className="truncate text-sm font-semibold tracking-tight sm:text-base">{orgName}</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm md:flex">
            <a href="#capabilities" className="text-[var(--muted)] transition hover:text-[var(--text)]">Capabilities</a>
            <a href="#workflow" className="text-[var(--muted)] transition hover:text-[var(--text)]">How it works</a>
            {email && <a href={`mailto:${email}`} className="text-[var(--muted)] transition hover:text-[var(--text)]">Contact</a>}
          </nav>

          <Link
            href={primaryHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-fg)] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
          >
            {primaryLabel}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className="relative isolate">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: colors.accent }} />
          <div className="absolute -left-28 top-40 h-80 w-80 rounded-full opacity-10 blur-3xl" style={{ background: colors.primary }} />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:py-32">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] shadow-sm">
              <span className="h-2 w-2 rounded-full" style={{ background: colors.accent }} />
              {eyebrow}
            </div>
            <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              {heroDescription}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={primaryHref} className="inline-flex items-center gap-3 rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-semibold text-[var(--primary-fg)] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:opacity-90">
                {primaryLabel}
                <span aria-hidden="true">→</span>
              </Link>
              <a href="#capabilities" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 text-sm font-semibold transition hover:border-[var(--primary)]">
                Explore the platform
              </a>
            </div>
            <p className="mt-5 text-xs leading-6 text-[var(--muted)]">
              Access is managed by your organization administrator.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-4 rounded-[2rem] opacity-20 blur-2xl" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }} />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl shadow-slate-900/10 sm:p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">Workspace overview</p>
                  <p className="mt-1 text-lg font-semibold">Your organization, in sync</p>
                </div>
                <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)]">Overview</span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5">
                {[
                  { label: "Programs", value: stats.programs, symbol: "◫" },
                  { label: "Mentors & team", value: stats.mentors, symbol: "◎" },
                  { label: "Participants", value: stats.students, symbol: "↗" },
                  { label: "Connected tools", value: features.length, symbol: "⌘" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--page)] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[var(--muted)]">{item.label}</span>
                      <span className="text-lg" style={{ color: colors.primary }}>{item.symbol}</span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold tracking-tight">{item.value.toLocaleString()}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                      <div className="h-full w-2/3 rounded-full" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: `${colors.accent}20`, color: colors.accent }}>✓</span>
                    <div>
                      <p className="text-sm font-semibold">One connected workflow</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">People, programs, and resources together</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: colors.accent }}>READY</span>
                </div>
              </div>
              <p className="px-1 pt-4 text-[11px] leading-5 text-[var(--muted)]">
                Counts reflect available records. Missing or unavailable database data is safely shown as zero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {showStats && (
        <section aria-label="Organization statistics" className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-[var(--border)] px-2 py-3 sm:px-8">
            <Stat value={stats.programs} label="Active programs" />
            <Stat value={stats.mentors} label="Mentors" />
            <Stat value={stats.students} label="Participants" />
          </div>
        </section>
      )}

      <section id="capabilities" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.primary }}>Designed to work together</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{featuresTitle}</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">{featuresDescription}</p>
        </div>

        <div className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article key={`${feature.title}-${index}`} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold" style={{ color: colors.primary, background: `${colors.primary}14` }}>
                {feature.icon}
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{feature.description}</p>
              <div className="mt-5 h-px w-10 transition-all group-hover:w-16" style={{ background: colors.accent }} />
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.primary }}>A simple operating model</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{stepsTitle}</h2>
          </div>
          <ol className="mt-11 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={`${step.title}-${index}`} className="relative border-t-2 pt-5" style={{ borderTopColor: colors.primary }}>
                <span className="text-xs font-bold tracking-[0.16em]" style={{ color: colors.primary }}>{step.number}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--primary)] px-6 py-12 text-center text-[var(--primary-fg)] sm:px-12 sm:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border opacity-20" style={{ borderColor: colors.primaryFg }} />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full border opacity-20" style={{ borderColor: colors.primaryFg }} />
          <div className="relative mx-auto max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-75">{orgName}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 opacity-80 sm:text-base">{ctaDescription}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={primaryHref} className="rounded-xl bg-white px-5 py-3.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5" style={{ color: colors.primary }}>
                {primaryLabel} <span aria-hidden="true">→</span>
              </Link>
              {email && (
                <a href={`mailto:${email}`} className="rounded-xl border px-5 py-3.5 text-sm font-semibold transition hover:bg-white/10" style={{ borderColor: `${colors.primaryFg}66` }}>
                  Contact your team
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="max-h-8 max-w-28 object-contain" />
            ) : (
              <BrandMark name={orgName} />
            )}
            <div>
              <p className="font-semibold">{orgName}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{footerText}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[var(--muted)]">
            {email && <a href={`mailto:${email}`} className="transition hover:text-[var(--text)]">{email}</a>}
            {supportUrl && <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--text)]">Help & support ↗</a>}
            <Link href={loginHref} className="transition hover:text-[var(--text)]">Sign in</Link>
          </div>
          <p className="text-xs text-[var(--muted)]">© {year} {orgName}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
