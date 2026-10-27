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
import Character, { type CharacterId } from '@/components/Character';
import { useRouter } from 'next/navigation';

type Props = {
  orgName?: string;
  logo?: string;
  contactEmail?: string;
  supportUrl?: string;
  /** Admin-defined note under the form (Settings → Sign-in). */
  notice?: string;
  /** Came here after changing the password. */
  passwordChanged?: boolean;
  /** Optional artwork from Settings → Appearance. */
  heroArt?: string;
  /** Original anime character for Anime Deluxe organisation themes. */
  character?: CharacterId | null;
  /** Show "Create an account" (Settings → Registration). */
  registrationOpen?: boolean;
};

export default function LoginForm({
  orgName = 'Nibras',
  logo = '',
  contactEmail = '',
  supportUrl = '',
  notice = '',
  passwordChanged = false,
  heroArt = '',
  character = null,
  registrationOpen = false,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Two-step sign-in
  const [needCode, setNeedCode] = useState(false);
  const [otp, setOtp] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      email,
      password,
      otp: needCode ? otp : '',
      redirect: false,
    });

    if (!res || res.error) {
      const err = res?.error ?? '';
      if (err.includes('TWO_FACTOR_REQUIRED')) {
        setNeedCode(true);
        setOtp('');
      } else if (err.includes('TWO_FACTOR_INVALID')) {
        setNeedCode(true);
        setError(useRecovery ? 'That recovery code is not valid (each code works once).' : 'That code is not right. Use the newest code from your app.');
      } else if (err.includes('ACCOUNT_PENDING')) {
        setNeedCode(false);
        setError('Your account is not active yet. Confirm your email (check your inbox) or wait for an admin to approve it.');
      } else if (err.includes('ACCOUNT_DISABLED')) {
        setNeedCode(false);
        setError('Your account is paused. Nothing was deleted — please contact your admin to reactivate it.');
      } else if (/too many/i.test(err)) {
        setError('Too many sign-in attempts. Please wait 15 minutes and try again.');
      } else {
        setNeedCode(false);
        setError('Invalid email or password');
      }
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  const brand = (
    <Link href="/" className="inline-flex items-center gap-2.5">
      {logo ? (
        <Image src={logo} alt={orgName} width={320} height={80} className="brand-logo" />
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
    <main className="min-h-dvh grid lg:grid-cols-[1.05fr_1fr] text-text">
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

        {character && <Character id={character} className="pointer-events-none absolute right-8 bottom-6 h-[62%] w-auto max-w-[50%] drop-shadow-2xl" />}
        {heroArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroArt}
            alt=""
            aria-hidden
            className="pointer-events-none absolute right-6 bottom-0 max-h-[70%] max-w-[55%] object-contain drop-shadow-2xl"
          />
        )}
        <p className="relative text-xs text-muted">
          © {new Date().getFullYear()} {orgName}
        </p>
      </section>

      {/* ---------------- Form ---------------- */}
      <section className="flex flex-col min-h-dvh">
        <div className="flex items-center justify-between px-5 sm:px-8 min-h-16 py-2 lg:hidden bg-hero">
          {brand}
          <Link href="/" className="text-sm text-muted hover:text-text transition">
            Home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
          <form onSubmit={onSubmit} className="w-full max-w-md space-y-6 bg-surface border border-border rounded-[var(--radius-lg)] p-6 sm:p-8 shadow-xl">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{needCode ? 'Two-step sign-in' : 'Sign in'}</h1>
              <p className="text-sm text-muted">
                {needCode
                  ? useRecovery
                    ? 'Enter one of your recovery codes (XXXX-XXXX).'
                    : 'Open your authenticator app and enter the 6-digit code.'
                  : 'Use the account your admin created for you.'}
              </p>
            </div>

            {passwordChanged && !error && (
              <div role="status" className="px-3.5 py-3 rounded-[var(--radius-md)] bg-success/10 text-success text-sm">
                Password changed. Sign in with your new password.
              </div>
            )}
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

            {needCode && (
              <div className="space-y-3">
                <input
                  id="otp"
                  className="input h-14 text-center text-2xl font-mono tracking-[0.35em]"
                  inputMode={useRecovery ? 'text' : 'numeric'}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={useRecovery ? 9 : 7}
                  placeholder={useRecovery ? 'XXXX-XXXX' : '000000'}
                  value={otp}
                  onChange={(e) => setOtp(useRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d ]/g, ''))}
                  aria-label={useRecovery ? 'Recovery code' : '6-digit code'}
                />
                <div className="flex items-center justify-between text-xs">
                  <button type="button" className="underline text-muted hover:text-text" onClick={() => { setUseRecovery((v) => !v); setOtp(''); setError(''); }}>
                    {useRecovery ? 'Use the authenticator app instead' : 'Lost your phone? Use a recovery code'}
                  </button>
                  <button type="button" className="underline text-muted hover:text-text" onClick={() => { setNeedCode(false); setOtp(''); setError(''); }}>
                    Back
                  </button>
                </div>
              </div>
            )}

            <div className={`space-y-4 ${needCode ? 'hidden' : ''}`}>
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
                <div className="flex items-center justify-between">
                  <label className="label" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="text-xs text-muted hover:text-text underline-offset-2 hover:underline">
                    Forgot password?
                  </Link>
                </div>
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
              {loading ? (needCode ? 'Checking…' : 'Signing in…') : needCode ? 'Verify' : 'Sign in'}
            </button>

            {notice && (
              <div className="rounded-[var(--radius-md)] border border-border px-4 py-3 text-xs text-text leading-relaxed whitespace-pre-line">
                {notice}
              </div>
            )}
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
            {registrationOpen && (
              <p className="text-center text-sm text-muted">
                New here?{' '}
                <Link href="/register" className="font-medium text-text underline underline-offset-2">
                  Create an account
                </Link>
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}