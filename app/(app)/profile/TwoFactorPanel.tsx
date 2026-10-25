// =============================================================================
// FILE: app/(app)/profile/TwoFactorPanel.tsx   (NEW FILE)
// Two-step sign-in: guided setup (scan QR → enter code → save recovery
// codes), status, new recovery codes, and turning it off.
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsCard, Field, Pill } from '@/components/settings-ui';
import { Alert } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import { begin2faAction, confirm2faAction, disable2faAction, regenerateRecoveryAction } from './actions';

type Props = {
  enabled: boolean;
  enabledAt: string | null;
  recoveryLeft: number;
  required: boolean;
  policyOff: boolean;
  orgName: string;
};

function CodesBox({ codes, orgName, onDone }: { codes: string[]; orgName: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `${orgName} — recovery codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join('\n')}\n`;
  return (
    <div className="space-y-4">
      <Alert tone="info">
        <b>Save these recovery codes now.</b> If you lose your phone, each code lets you sign in once. They won&apos;t be shown again.
      </Alert>
      <ol className="grid grid-cols-2 gap-2 p-4 rounded-[var(--radius-md)] border border-dashed border-border bg-bg/60 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="tabular-nums tracking-wider">
            {c}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-outline h-10 px-4"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
        <a className="btn-outline h-10 px-4" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download="recovery-codes.txt">
          Download .txt
        </a>
        <button type="button" className="btn-primary h-10 px-4 ml-auto" onClick={onDone}>
          I&apos;ve saved them
        </button>
      </div>
    </div>
  );
}

export default function TwoFactorPanel({ enabled, enabledAt, recoveryLeft, required, policyOff, orgName }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<'idle' | 'scan' | 'codes' | 'disable' | 'regen'>('idle');
  const [setup, setSetup] = useState<{ secret: string; qrSvg: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState('');

  const reset = () => {
    setCode('');
    setPassword('');
    setError('');
  };

  if (policyOff && !enabled) {
    return (
      <SettingsCard title="Two-step sign-in" description="Your admin has switched this feature off." icon={<NavIcon name="shield" />} />
    );
  }

  return (
    <SettingsCard
      id="two-step"
      title="Two-step sign-in"
      description="After your password, enter a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…). Even if someone learns your password, they can't get in."
      icon={<NavIcon name="shield" />}
      tone={required && !enabled ? 'warning' : 'default'}
      actions={enabled ? <Pill tone="success">● On</Pill> : <Pill tone={required ? 'warning' : 'muted'}>{required ? 'Required' : 'Off'}</Pill>}
    >
      {error && <Alert tone="error">{error}</Alert>}

      {/* ---------- recovery codes just created ---------- */}
      {step === 'codes' && (
        <CodesBox
          codes={codes}
          orgName={orgName}
          onDone={() => {
            setStep('idle');
            setCodes([]);
            router.refresh();
          }}
        />
      )}

      {/* ---------- OFF ---------- */}
      {!enabled && step === 'idle' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <ul className="flex-1 space-y-1.5 text-sm text-muted">
            <li>📱 Install any authenticator app on your phone.</li>
            <li>🔳 Scan a QR code — takes about a minute.</li>
            <li>🔑 Save 10 one-time recovery codes in case you lose your phone.</li>
          </ul>
          <button
            type="button"
            className="btn-primary h-11 px-5"
            disabled={pending}
            onClick={() => {
              reset();
              start(async () => {
                const r = await begin2faAction();
                if (r.ok) {
                  setSetup(r);
                  setStep('scan');
                } else setError(r.error);
              });
            }}
          >
            {pending ? 'Preparing…' : 'Turn on two-step sign-in'}
          </button>
        </div>
      )}

      {!enabled && step === 'scan' && setup && (
        <div className="grid md:grid-cols-[240px_1fr] gap-6 items-start">
          <div className="space-y-2">
            <div className="rounded-[var(--radius-md)] bg-white p-3 border border-border w-fit mx-auto md:mx-0" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} aria-label="QR code" />
            <a href={setup.otpauth} className="md:hidden block text-center text-sm underline">
              Open in authenticator app
            </a>
          </div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              start(async () => {
                const r = await confirm2faAction({ code });
                if (r.ok) {
                  setCodes(r.recoveryCodes);
                  setStep('codes');
                  setSetup(null);
                } else setError(r.error);
              });
            }}
          >
            <ol className="space-y-2 text-sm">
              <li>
                <b>1.</b> In your authenticator app, tap <b>+</b> and scan the QR code.
              </li>
              <li>
                <b>2.</b> Can&apos;t scan? Enter this key instead:
                <code className="mt-1 block w-fit max-w-full break-all rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2 font-mono text-[13px] tracking-wider select-all">
                  {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
                </code>
              </li>
              <li>
                <b>3.</b> Type the 6-digit code the app shows:
              </li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input h-12 sm:w-48 text-center text-xl font-mono tracking-[0.4em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                aria-label="6-digit code"
                autoFocus
              />
              <button type="submit" className="btn-primary h-12 px-5" disabled={pending || code.replace(/\s/g, '').length !== 6}>
                {pending ? 'Checking…' : 'Verify & turn on'}
              </button>
              <button type="button" className="btn-ghost h-12" onClick={() => setStep('idle')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- ON ---------- */}
      {enabled && step === 'idle' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-[var(--radius-md)] border border-border">
              <p className="text-xs text-muted">Turned on</p>
              <p className="text-sm font-medium">{enabledAt ?? '—'}</p>
            </div>
            <div className="p-3.5 rounded-[var(--radius-md)] border border-border">
              <p className="text-xs text-muted">Recovery codes left</p>
              <p className={`text-sm font-medium ${recoveryLeft <= 2 ? 'text-warning' : ''}`}>
                {recoveryLeft} of 10{recoveryLeft <= 2 && ' — create new ones'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline h-10 px-4" onClick={() => { reset(); setStep('regen'); }}>
              New recovery codes
            </button>
            {!required && (
              <button type="button" className="btn-ghost h-10 px-4 text-danger" onClick={() => { reset(); setStep('disable'); }}>
                Turn off
              </button>
            )}
          </div>
        </div>
      )}

      {enabled && step === 'regen' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            start(async () => {
              const r = await regenerateRecoveryAction({ code });
              if (r.ok) {
                setCodes(r.recoveryCodes);
                setStep('codes');
              } else setError(r.error);
            });
          }}
        >
          <p className="text-sm text-muted">Your old recovery codes will stop working. Enter a code from your authenticator app to continue.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="input h-11 sm:w-48 font-mono tracking-widest text-center" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Authenticator code" />
            <button className="btn-primary h-11 px-5" disabled={pending}>
              {pending ? 'Creating…' : 'Create new codes'}
            </button>
            <button type="button" className="btn-ghost h-11" onClick={() => setStep('idle')}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {enabled && step === 'disable' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            start(async () => {
              const r = await disable2faAction({ password, code });
              if (r.ok) {
                setStep('idle');
                router.refresh();
              } else setError(r.error);
            });
          }}
        >
          <p className="text-sm text-muted">This makes your account easier to break into. Confirm with your password and a code (or a recovery code).</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Password">
              <input type="password" className="input h-11" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="Code">
              <input className="input h-11 font-mono tracking-widest" autoComplete="one-time-code" placeholder="000000 or XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button className="btn-danger h-11 px-5" disabled={pending}>
              {pending ? 'Turning off…' : 'Turn off two-step sign-in'}
            </button>
            <button type="button" className="btn-ghost h-11" onClick={() => setStep('idle')}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}
