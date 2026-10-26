'use client';

// =============================================================================
// FILE: components/feedback.tsx   (NEW FILE)
// App-wide feedback kit, mounted once in components/providers.tsx:
//   useToast()   → toast.success('Saved') / toast.error('…') / toast.info('…')
//   useConfirm() → if (await confirm({ title, body, tone:'danger' })) …
//   <Modal open onClose title>…</Modal>   accessible dialog (focus trap, Esc)
//   useSudo()    → await sudo(() => someServerAction(x))
//                  runs the action; if it answers REAUTH_REQUIRED, asks the
//                  user to confirm their password (+2FA code) and retries once.
// =============================================================================

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { REAUTH_REQUIRED } from '@/lib/reauth-shared';
import { confirmIdentityAction } from '@/app/(app)/reauth-actions';

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () =>
      Array.from(
        el?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])') ?? []
      );
    const t = setTimeout(() => {
      const auto = el?.querySelector<HTMLElement>('[autofocus],[data-autofocus]');
      (auto ?? focusables()[0] ?? el)?.focus();
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, dismissable, onClose]);

  if (!open || !mounted) return null;
  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-[ui-fade-in_.15s_ease-out]"
        onClick={dismissable ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`ui-popover ui-dialog relative w-full ${width} max-h-[92dvh] flex flex-col bg-surface border border-border rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] shadow-2xl animate-[ui-pop-in_.18s_ease-out] outline-none`}
      >
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          </div>
          {dismissable && (
            <button type="button" onClick={onClose} className="btn-ghost !p-1.5 -mr-1.5 -mt-1" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {children && <div className="px-5 pb-4 overflow-y-auto ui-scroll">{children}</div>}
        {footer && (
          <div className="px-5 py-3.5 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; text: string; action?: { label: string; onClick: () => void } };
type ToastApi = {
  show: (kind: ToastKind, text: string, action?: ToastItem['action']) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string, action?: ToastItem['action']) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

// Fallback so components work even outside the provider (e.g. tests).
const noopToast: ToastApi = {
  show: (_k, t) => console.info('[toast]', t),
  success: (t) => console.info('[toast]', t),
  error: (t) => console.warn('[toast]', t),
  info: (t) => console.info('[toast]', t),
};

export function useToast(): ToastApi {
  return useContext(ToastCtx) ?? noopToast;
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {kind === 'success' ? (
        <path d="M20 6 9 17l-5-5" />
      ) : kind === 'error' ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

type ConfirmOptions = {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  /** User must type this exact text to enable the confirm button. */
  typeToConfirm?: string;
};
type ConfirmFn = (o: ConfirmOptions) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmCtx) ?? (async (o) => window.confirm(o.title));
}

// ---------------------------------------------------------------------------
// Sudo (confirm identity)
// ---------------------------------------------------------------------------

type SudoFn = <R>(run: () => Promise<R>) => Promise<R>;
const SudoCtx = createContext<SudoFn | null>(null);

function needsReauth(r: unknown): boolean {
  return !!r && typeof r === 'object' && (r as { error?: unknown }).error === REAUTH_REQUIRED;
}

/** Wrap a server-action call; prompts for identity confirmation when needed. */
export function useSudo(): SudoFn {
  return useContext(SudoCtx) ?? (async (run) => run());
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  // toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>(
    (kind, text, action) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-3), { id, kind, text, action }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
    },
    [dismiss]
  );
  const api = useRef<ToastApi>({
    show: (...a) => show(...a),
    success: (t) => show('success', t),
    error: (t) => show('error', t),
    info: (t, a) => show('info', t, a),
  });

  // confirm
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState('');
  const confirm = useCallback<ConfirmFn>(
    (o) =>
      new Promise<boolean>((resolve) => {
        setTyped('');
        setConfirmState({ ...o, resolve });
      }),
    []
  );
  const closeConfirm = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  // sudo
  const [sudoOpen, setSudoOpen] = useState(false);
  const sudoResolve = useRef<((ok: boolean) => void) | null>(null);
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [needCode, setNeedCode] = useState(false);
  const [sudoErr, setSudoErr] = useState('');
  const [sudoBusy, setSudoBusy] = useState(false);

  const askIdentity = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        sudoResolve.current = resolve;
        setPw('');
        setCode('');
        setSudoErr('');
        setSudoOpen(true);
      }),
    []
  );
  const closeSudo = (ok: boolean) => {
    setSudoOpen(false);
    sudoResolve.current?.(ok);
    sudoResolve.current = null;
  };
  const submitSudo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSudoBusy(true);
    setSudoErr('');
    try {
      const r = await confirmIdentityAction({ password: pw, code });
      if (r.ok) closeSudo(true);
      else {
        setSudoErr(r.error);
        if (r.needCode) setNeedCode(true);
      }
    } catch {
      setSudoErr('Could not confirm right now. Please try again.');
    } finally {
      setSudoBusy(false);
    }
  };

  const sudo = useCallback<SudoFn>(
    async (run) => {
      const first = await run();
      if (!needsReauth(first)) return first;
      const ok = await askIdentity();
      if (!ok) return { ok: false, error: 'Cancelled' } as never;
      return run();
    },
    [askIdentity]
  );

  return (
    <ToastCtx.Provider value={api.current}>
      <ConfirmCtx.Provider value={confirm}>
        <SudoCtx.Provider value={sudo}>
          {children}

          {/* toasts */}
          <div
            aria-live="polite"
            className="fixed z-[100] bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-5 left-1/2 -translate-x-1/2 lg:left-auto lg:right-5 lg:translate-x-0 flex flex-col gap-2 w-[min(92vw,380px)] pointer-events-none"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className={`ui-popover pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-[var(--radius-lg)] border border-border bg-surface shadow-xl text-sm animate-[ui-pop-in_.18s_ease-out] ${
                  t.kind === 'success' ? 'text-success' : t.kind === 'error' ? 'text-danger' : 'text-text'
                }`}
              >
                <ToastIcon kind={t.kind} />
                <p className="flex-1 min-w-0 text-text">{t.text}</p>
                {t.action && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline shrink-0"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button type="button" onClick={() => dismiss(t.id)} className="text-muted hover:text-text shrink-0" aria-label="Dismiss">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* confirm */}
          <Modal
            open={!!confirmState}
            onClose={() => closeConfirm(false)}
            size="sm"
            title={confirmState?.title ?? ''}
            description={confirmState?.body}
            footer={
              <>
                <button type="button" className="btn-outline" onClick={() => closeConfirm(false)}>
                  {confirmState?.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  type="button"
                  data-autofocus
                  className={confirmState?.tone === 'danger' ? 'btn-danger' : 'btn-primary'}
                  disabled={!!confirmState?.typeToConfirm && typed.trim() !== confirmState.typeToConfirm}
                  onClick={() => closeConfirm(true)}
                >
                  {confirmState?.confirmLabel ?? 'Confirm'}
                </button>
              </>
            }
          >
            {confirmState?.typeToConfirm && (
              <label className="block text-sm">
                <span className="text-muted">
                  Type <strong className="text-text font-mono">{confirmState.typeToConfirm}</strong> to confirm
                </span>
                <input className="input mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
              </label>
            )}
          </Modal>

          {/* sudo */}
          <Modal
            open={sudoOpen}
            onClose={() => closeSudo(false)}
            size="sm"
            title="Confirm it's you"
            description="This is a high-impact action. Enter your password to continue — you won't be asked again for 10 minutes."
          >
            <form onSubmit={submitSudo} className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium">Password</span>
                <input
                  type="password"
                  className="input mt-1.5"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </label>
              {needCode && (
                <label className="block text-sm">
                  <span className="font-medium">Authenticator or recovery code</span>
                  <input
                    className="input mt-1.5 font-mono tracking-widest"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123 456"
                  />
                </label>
              )}
              {sudoErr && (
                <p role="alert" className="text-sm text-danger">
                  {sudoErr}
                </p>
              )}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button type="button" className="btn-outline" onClick={() => closeSudo(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={sudoBusy || !pw}>
                  {sudoBusy ? 'Checking…' : 'Confirm'}
                </button>
              </div>
            </form>
          </Modal>
        </SudoCtx.Provider>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
