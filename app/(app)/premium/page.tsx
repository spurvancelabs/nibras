// =============================================================================
// FILE: app/(app)/premium/page.tsx   (NEW FILE)
// Premium page for every member: current status (active until / lifetime /
// free), what's included, a preview of premium themes, "Have a code?",
// how to get Premium (text set by the Super Admin) and membership history.
// No fake payment button — getting Premium is via an admin or a code.
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { membershipHistory, policyFrom } from '@/lib/premium';
import { daysLeft, hasPremiumAccess, isLifetime, isPremiumActive, themeTier, styleTier } from '@/lib/entitlements';
import { THEME_PRESETS } from '@/lib/theme-config';
import { UI_STYLES } from '@/lib/ui-styles';
import { sceneBackground } from '@/lib/theme-scenes';
import { formatDate, formatDateTime } from '@/lib/time';
import { PageHeader, Panel, Badge, EmptyNote } from '@/components/ui';
import NavIcon from '@/components/NavIcon';
import RedeemForm from './RedeemForm';
import Character from '@/components/Character';
import { effectivePreset, characterFor } from '@/lib/appearance';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Premium' };

const EVENT_LABEL = {
  granted: 'Premium started',
  extended: 'Premium extended',
  redeemed: 'Code redeemed',
  revoked: 'Premium removed',
  expired: 'Premium ended',
} as const;

export default async function PremiumPage() {
  const user = await requireAuth();
  const s = await getSettings();
  const name = s.premiumName || 'Premium';

  if (!s.premiumEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader title={name} subtitle="Membership" />
        <Panel>
          <EmptyNote
            icon={<NavIcon name="crown" />}
            title="Every theme is free right now"
            text={
              user.role === 'admin'
                ? 'Premium is switched off. A Super Admin can turn it on in Settings → Premium.'
                : 'Your organisation has not set up a premium membership. Enjoy all themes and styles!'
            }
            action={
              <Link href="/profile?tab=appearance" className="btn-primary">
                Choose a theme
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  const policy = policyFrom(s);
  const active = isPremiumActive(user.premiumUntil);
  const access = hasPremiumAccess(user, policy);
  const left = daysLeft(user.premiumUntil);
  const history = await membershipHistory(user.orgId, user.id).catch(() => []);

  const premiumThemes = THEME_PRESETS.filter((p) => themeTier(p, policy) === 'premium');
  const premiumStyles = UI_STYLES.filter((st) => styleTier(st, policy) === 'premium');
  const showcase = [...premiumThemes.filter((p) => p.scene && p.category === 'Anime Deluxe').slice(0, 3), ...premiumThemes.filter((p) => p.scene && p.category === 'Deluxe').slice(0, 3)];
  const perks = s.premiumPerks
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-hero p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-primary/15 blur-2xl" />
        <div className="relative grid md:grid-cols-[minmax(0,1fr)_220px] gap-6 items-center">
          <div className="min-w-0 space-y-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              <NavIcon name="crown" size={14} /> {name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {active ? (isLifetime(user.premiumUntil) ? `Lifetime ${name}` : `You're a ${name} member`) : user.role === 'admin' ? `You have full access` : `Unlock the premium look`}
            </h1>
            <p className="text-sm text-muted max-w-xl">
              {active
                ? isLifetime(user.premiumUntil)
                  ? 'Every premium theme and style is yours, for good.'
                  : `Active until ${formatDate(user.premiumUntil!)} · ${left} day${left === 1 ? '' : 's'} left.`
                : user.role === 'admin'
                  ? 'Admins can use every premium theme and style to configure and preview them. Members need an active membership.'
                  : `${premiumThemes.length} premium themes and ${premiumStyles.length} premium design style${premiumStyles.length === 1 ? '' : 's'} — illustrated Deluxe and Anime scenes, original characters and the flagship Deluxe look.`}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {active ? <Badge tone="success" dot>active</Badge> : access ? <Badge tone="primary">admin access</Badge> : <Badge tone="muted">free plan</Badge>}
              <Link href="/profile?tab=appearance" className="btn-outline h-9 px-4 text-sm">
                {access ? 'Choose a premium theme' : 'Preview premium themes'}
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <Character id={characterFor(effectivePreset(s, policy, user), true) ?? 'sage'} className="w-full h-auto max-h-64" title="Premium mascot" />
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Panel title="What's included" icon={<NavIcon name="sparkle" size={16} />}>
            <ul className="grid sm:grid-cols-2 gap-3 text-sm">
              <li className="flex gap-2.5">
                <span aria-hidden>🌸</span>
                <span>
                  <b>Anime Deluxe themes</b>
                  <span className="block text-muted text-xs">Illustrated scenes with original anime-style characters.</span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden>💎</span>
                <span>
                  <b>Deluxe themes</b>
                  <span className="block text-muted text-xs">Gold, marble, velvet and art-deco scenes.</span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden>✨</span>
                <span>
                  <b>The Deluxe design style</b>
                  <span className="block text-muted text-xs">Gilded borders, refined dialogs, forms and scrollbars.</span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden>🔁</span>
                <span>
                  <b>Nothing is lost</b>
                  <span className="block text-muted text-xs">If Premium ends, your choice is saved and returns when you renew.</span>
                </span>
              </li>
              {perks.map((p, i) => (
                <li key={i} className="flex gap-2.5">
                  <span aria-hidden>⭐</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {showcase.length > 0 && (
            <Panel title="A taste of premium" icon={<NavIcon name="palette" size={16} />}>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {showcase.map((p) => (
                  <li key={p.id}>
                    <Link
                      href="/profile?tab=appearance"
                      className="block rounded-[var(--radius-md)] border border-border overflow-hidden hover:border-primary transition-colors"
                    >
                      <span
                        className="block h-24"
                        style={{ background: `${p.scene ? sceneBackground(p.scene, p.light, false) + ',' : ''} ${p.light.heroBg}` }}
                        aria-hidden
                      />
                      <span className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.light.primary }} aria-hidden />
                        <span className="truncate">{p.name}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          {user.role !== 'admin' && (
            <Panel title="Have a code?" icon={<NavIcon name="lock" size={16} />}>
              <div className="space-y-3">
                <p className="text-sm text-muted">Enter the code you got from your organisation. It adds time on top of any Premium you already have.</p>
                <RedeemForm />
              </div>
            </Panel>
          )}

          <Panel title={`How to get ${name}`} icon={<NavIcon name="crown" size={16} />}>
            {s.premiumHowTo.trim() ? (
              <p className="text-sm whitespace-pre-line">{s.premiumHowTo}</p>
            ) : (
              <p className="text-sm text-muted">
                Ask your program administrator. They can give you {name} directly or send you a code
                {s.contactEmail ? (
                  <>
                    {' '}
                    — or write to{' '}
                    <a className="underline" href={`mailto:${s.contactEmail}`}>
                      {s.contactEmail}
                    </a>
                  </>
                ) : null}
                .
              </p>
            )}
          </Panel>

          <Panel title="History" icon={<NavIcon name="sessions" size={16} />}>
            {history.length ? (
              <ol className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${h.type === 'revoked' || h.type === 'expired' ? 'bg-muted' : 'bg-success'}`} aria-hidden />
                    <span className="min-w-0">
                      <b>{EVENT_LABEL[h.type]}</b>
                      {h.until && <span className="text-muted"> · until {isLifetime(h.until) ? 'lifetime' : formatDate(h.until)}</span>}
                      <span className="block text-xs text-muted">
                        {formatDateTime(h.at)}
                        {h.actorName && h.source === 'admin' ? ` · by ${h.actorName}` : ''}
                      </span>
                      {h.note && <span className="block text-xs text-muted italic">“{h.note}”</span>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">No membership changes yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
