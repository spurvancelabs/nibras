// =============================================================================
// FILE: app/login/LoginForm.tsx
// Sign-in screen (client). Split layout: brand panel (desktop) + form.
// Sign-in logic unchanged: next-auth credentials → /dashboard.
// =============================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Props = {
  orgName?: string;
  logo?: string;
  contactEmail?: string;
  supportUrl?: string;
};

export default function LoginForm({
  orgName = 'Nibras',
  logo = '',
  contactEmail = '',
  supportUrl = '',
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  const brand = (
    <Link href="/" className="inline-flex items-center gap-2.5">
      {logo ? (
        <Image src={logo} alt={orgName} width={140} height={28} className="h-8 w-auto object-contain" />
      ) : (
        <>
          <span aria-hidden className="flex items-center">
            <span className="w-5 h-5 rounded-full bg-primary" />
            <span className="w-5 h-5 -ml-1.5 rounded-full border-2 border-primary bg-hero" />
          </span>
          <span className="font-semibold text-[15px]">{orgName}</span>
        </>
      )}
    </Link>
  );

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-bg text-text">
      {/* ---------------- Brand panel (desktop) ---------------- */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-hero p-12 xl:p-16">
        <span
          aria-hidden
          className="pointer-events-none absolute right-12 top-24 w-28 h-24 text-muted opacity-50 bg-[radial-gradient(currentColor_1.3px,transparent_1.5px)] [background-size:18px_18px]"
        />
        <svg
          aria-hidden
          viewBox="0 0 400 400"
          className="absolute -right-24 bottom-[-6rem] w-[34rem] text-accent"
        >
          <path
            fill="currentColor"
            d="M83 92c39-50 120-71 182-52 54 17 104 64 109 126 5 55-28 98-37 152-8 47-58 70-108 60-41-8-55-48-96-58C83 309 34 290 26 238c-6-42 25-60 31-98 4-21 11-31 26-48Z"
          />
        </svg>

        <div className="relative">{brand}</div>

        <div className="relative max-w-md">
          <h2 className="text-4xl xl:text-5xl font-semibold leading-[1.15] tracking-tight">
            Welcome back to your learning space.
          </h2>
          <p className="mt-5 text-muted leading-relaxed">
            Sessions, assignments, materials and mentor conversations — all in one
            place for every program at {orgName}.
          </p>

          {/* Mini course card */}
          <div className="mt-10 w-72 p-3 bg-surface border border-border shadow-xl rotate-[-2deg] rounded-[var(--radius-lg)]">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-11 h-11 rounded-[var(--radius-md)] bg-primary text-primary-fg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted">Next session</p>
                <p className="text-sm font-medium truncate">Live class & recording</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-hero overflow-hidden">
              <span className="block h-full w-2/3 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        <p className="relative text-xs text-muted">
          © {new Date().getFullYear()} {orgName}
        </p>
      </section>

      {/* ---------------- Form ---------------- */}
      <section className="flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-5 sm:px-8 h-16 lg:hidden bg-hero">
          {brand}
          <Link href="/" className="text-sm text-muted hover:text-text transition">
            Home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
          <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted">Use the account your admin created for you.</p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-[var(--radius-md)] bg-danger/10 text-danger text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="input h-12 pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input h-12 pl-10 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-[var(--radius-md)] text-muted hover:text-text hover:bg-hero transition"
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-10-8-10-8a18 18 0 0 1 5.1-6M9.9 4.2A9 9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-primary text-primary-fg text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading && (
                <span className="w-4 h-4 rounded-full border-2 border-primary-fg/30 border-t-primary-fg animate-spin" />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="rounded-[var(--radius-md)] bg-hero px-4 py-3 text-xs text-muted leading-relaxed">
              Accounts are created by your admin.
              {contactEmail && (
                <>
                  {' '}Need access?{' '}
                  <a href={`mailto:${contactEmail}`} className="font-medium text-text underline underline-offset-2">
                    {contactEmail}
                  </a>
                </>
              )}
              {!contactEmail && supportUrl && (
                <>
                  {' '}Need help?{' '}
                  <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-text underline underline-offset-2">
                    Contact support
                  </a>
                </>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}