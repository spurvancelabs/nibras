// =============================================================================
// FILE: lib/auth.ts
// NextAuth (v4) configuration.
// NEW security layers — all backward compatible (nobody is signed out on deploy):
//   1. Sign-in throttling: per IP+email, per account and per IP (MongoDB-backed,
//      fail-open). Shared university / mobile IPs get a generous limit.
//   2. Same response time whether or not the email exists (no account probing).
//   3. lastLoginAt / lastLoginIp recorded; sign-ins & failures audited.
//   4. auth() re-checks the account on every request (30 s cache, cleared
//      instantly on admin changes): disabled users, changed roles and
//      "sign out everywhere" take effect immediately.
//   5. Two-step sign-in (authenticator code / recovery code) when switched on
//      for the account. Emergency switch: AUTH_2FA=off.
//   6. Session length from Settings → Security (cookies older than that are
//      treated as signed out); new-network alerts for staff.
// Kill switch: set AUTH_LIVE_CHECKS=off to turn layer 4 off (then redeploy).
// =============================================================================

import NextAuth, { type DefaultSession, type NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import User from '@/models/User';
import { authConfig } from './auth.config';
import type { Role } from '@/lib/constants';
import { getAuthState } from './auth-state';
import { getCounts, hit, clear } from './rate-limit';
import { clientIp } from './request-info';
import { fingerprint } from './secret-box';
import { audit } from './audit';
import { verifySecondFactor, twoFactorDisabledByEnv } from './two-factor';
import { getSettings } from './settings';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
  /** 6-digit authenticator code or a recovery code (two-step sign-in). */
  otp: z.string().max(20).optional().default(''),
});

/** Messages the login form understands (NextAuth passes them as `error`). */
export const TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED';
export const TWO_FACTOR_INVALID = 'TWO_FACTOR_INVALID';

/** Same network? (IPv4 /24 or IPv6 /64-ish) — keeps new-network alerts quiet on mobile data. */
function sameNetwork(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  if (a.includes('.') && b.includes('.')) return a.split('.').slice(0, 3).join('.') === b.split('.').slice(0, 3).join('.');
  return a.split(':').slice(0, 4).join(':') === b.split(':').slice(0, 4).join(':');
}

// Extend the session type
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      orgId: string;
      /** session version the cookie was issued with */
      sv?: number;
      /** effective royal-admin status (live, from the database) */
      royal?: boolean;
      /** personal theme preset id */
      themePreset?: string;
      /** personal design style id */
      uiStyle?: string;
      /** two-step sign-in is on */
      twoFactorEnabled?: boolean;
      /** profile photo */
      avatar?: string;
      /** effective Super Admin status (live) */
      superAdmin?: boolean;
      /** premium membership end (ISO) or null */
      premiumUntil?: string | null;
      tokens?: number;
      /** sign-in time (ms) */
      at?: number;
    } & DefaultSession['user'];
  }

  interface User {
    role: Role;
    orgId: string;
    sessionVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sv?: number;
    /** sign-in time (ms) — used for the "session length" setting */
    at?: number;
  }
}

// --- throttling --------------------------------------------------------------
const WINDOW_SECONDS = 15 * 60;
const LIMITS = {
  ipEmail: 8, // same device guessing one account
  account: 25, // one account from anywhere (distributed guessing)
  ip: 150, // one IP for all accounts (high: classrooms / mobile carriers share IPs)
};
export const TOO_MANY_ATTEMPTS = 'Too many sign-in attempts. Please wait 15 minutes and try again.';

let dummyHashPromise: Promise<string> | null = null;
function dummyHash() {
  return (dummyHashPromise ??= bcrypt.hash('timing-equaliser-not-a-password', 10));
}

function header(h: unknown, name: string): string | undefined {
  if (!h) return undefined;
  if (typeof (h as Headers).get === 'function') return (h as Headers).get(name) ?? undefined;
  const v = (h as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(v) ? v[0] : v;
}

// Callbacks from auth.config are kept; we only add the session version.
type Callbacks = NonNullable<NextAuthOptions['callbacks']>;
const baseCallbacks: Callbacks =
  ((authConfig as unknown as { callbacks?: Callbacks }).callbacks ?? {}) as Callbacks;

export const authOptions: NextAuthOptions = {
  ...(authConfig as unknown as Partial<NextAuthOptions>),
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'Code', type: 'text' },
      },
      async authorize(credentials, req) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const ip = clientIp(header(req?.headers, 'x-forwarded-for'), header(req?.headers, 'x-real-ip'));
        const userAgent = (header(req?.headers, 'user-agent') ?? '').slice(0, 300);
        const eh = fingerprint(email);
        const keys = {
          ipEmail: `login:ie:${ip || '-'}:${eh}`,
          account: `login:a:${eh}`,
          ip: `login:i:${ip || '-'}`,
        };

        let blocked = false;
        try {
          await db();

          const counts = await getCounts(Object.values(keys));
          blocked =
            (counts.get(keys.ipEmail) ?? 0) >= LIMITS.ipEmail ||
            (counts.get(keys.account) ?? 0) >= LIMITS.account ||
            (!!ip && (counts.get(keys.ip) ?? 0) >= LIMITS.ip);

          const user = await User.findOne({ email }).select('+passwordHash').lean();

          if (blocked) {
            if (user) {
              await audit({
                orgId: String(user.orgId),
                action: 'auth.login_blocked',
                targetIds: [String(user._id)],
                summary: email,
                ip,
                userAgent,
              });
              // Tell the account owner and royal admins (at most once an hour each).
              void alertBlockedSignIn(String(user.orgId), String(user._id), email, ip).catch(() => {});
            }
          } else {
            // Always run bcrypt so "no such email" takes as long as "wrong password".
            const ok = await bcrypt.compare(
              parsed.data.password,
              (user?.passwordHash as string | undefined) ?? (await dummyHash())
            );

            if (!user || !ok) {
              await Promise.all([
                hit(keys.ipEmail, WINDOW_SECONDS),
                hit(keys.account, WINDOW_SECONDS),
                ip ? hit(keys.ip, WINDOW_SECONDS) : Promise.resolve(0),
                user
                  ? audit({
                      orgId: String(user.orgId),
                      action: 'auth.login_failed',
                      targetIds: [String(user._id)],
                      summary: email,
                      ip,
                      userAgent,
                    })
                  : Promise.resolve(),
              ]);
              return null;
            }

            // Correct password but the account is disabled/paused: say so
            // (safe — only revealed to someone who knows the password).
            if (user.status === 'pending') throw new Error('ACCOUNT_PENDING');
            if (user.status !== 'active') throw new Error('ACCOUNT_DISABLED');

            // ---- two-step sign-in ----
            if (user.twoFactorEnabled === true && !twoFactorDisabledByEnv()) {
              if (!parsed.data.otp.trim()) throw new Error(TWO_FACTOR_REQUIRED);
              const second = await verifySecondFactor(String(user._id), parsed.data.otp);
              if (second === 'invalid') {
                await Promise.all([
                  hit(keys.ipEmail, WINDOW_SECONDS),
                  hit(keys.account, WINDOW_SECONDS),
                  audit({
                    orgId: String(user.orgId),
                    action: 'auth.2fa_failed',
                    targetIds: [String(user._id)],
                    summary: email,
                    ip,
                    userAgent,
                  }),
                ]);
                throw new Error(TWO_FACTOR_INVALID);
              }
              if (second === 'recovery') {
                await audit({
                  orgId: String(user.orgId),
                  action: 'auth.recovery_used',
                  actorId: String(user._id),
                  actorEmail: user.email,
                  actorName: user.name,
                  targetIds: [String(user._id)],
                  ip,
                  userAgent,
                });
              }
            }

            // ---- new-network alert (staff only, in-app, never blocks) ----
            if (user.role !== 'student' && user.lastLoginIp && ip && !sameNetwork(user.lastLoginIp as string, ip)) {
              void (async () => {
                try {
                  const st = await getSettings();
                  if (!st.newSignInAlerts) return;
                  const { notify } = await import('./notifications');
                  await notify({
                    orgId: String(user.orgId),
                    userId: String(user._id),
                    type: 'security.signin',
                    title: 'New sign-in to your account',
                    body: `From a new network (${ip}). If this wasn't you, change your password and turn on two-step sign-in.`,
                    link: '/profile?tab=security',
                    dedupeKey: `signin:${String(user._id)}:${ip}:${new Date().toISOString().slice(0, 10)}`,
                  });
                  await audit({
                    orgId: String(user.orgId),
                    action: 'auth.new_network',
                    actorId: String(user._id),
                    actorEmail: user.email,
                    actorName: user.name,
                    targetIds: [String(user._id)],
                    summary: `${user.lastLoginIp} → ${ip}`,
                    ip,
                    userAgent,
                  });
                } catch (e) {
                  console.error('[auth] new-network alert failed', e);
                }
              })();
            }

            await Promise.all([
              clear([keys.ipEmail, keys.account]),
              User.updateOne(
                { _id: user._id },
                { $set: { lastLoginAt: new Date(), lastLoginIp: ip } }
              ).catch((e: unknown) => console.error('[auth] lastLogin update failed', e)),
              audit({
                orgId: String(user.orgId),
                action: 'auth.login',
                actorId: String(user._id),
                actorEmail: user.email,
                actorName: user.name,
                targetIds: [String(user._id)],
                ip,
                userAgent,
              }),
            ]);

            return {
              id: String(user._id),
              name: user.name,
              email: user.email,
              role: user.role,
              orgId: String(user.orgId),
              sessionVersion: Number(user.sessionVersion ?? 0) || 0,
            };
          }
        } catch (error) {
          // Two-step messages go back to the login form as-is.
          if (error instanceof Error && (error.message === TWO_FACTOR_REQUIRED || error.message === TWO_FACTOR_INVALID || error.message === 'ACCOUNT_DISABLED' || error.message === 'ACCOUNT_PENDING')) {
            throw error;
          }
          console.error('Auth error:', error);
          return null;
        }

        // Shown on the login page (NextAuth passes the message as `error`).
        throw new Error(TOO_MANY_ATTEMPTS);
      },
    }),
  ],
  events: {
    async signOut(message) {
      const t = (message as { token?: { id?: string; orgId?: string; email?: string; name?: string } }).token;
      if (t?.id && t.orgId) {
        await audit({
          orgId: t.orgId,
          action: 'auth.logout',
          actorId: t.id,
          actorEmail: t.email ?? '',
          actorName: t.name ?? '',
          targetIds: [t.id],
        });
      }
    },
  },
  callbacks: {
    ...baseCallbacks,
    async jwt(params) {
      // Remember the version before the existing callback runs: if it rebuilds
      // the token from scratch, `sv` would otherwise be lost and the user
      // would be signed out right after signing in.
      const prevSv = (params.token as { sv?: number } | undefined)?.sv;
      const token = baseCallbacks.jwt ? await baseCallbacks.jwt(params) : params.token;
      const prevAt = (params.token as { at?: number } | undefined)?.at;
      if (params.user) {
        token.sv = Number((params.user as { sessionVersion?: number }).sessionVersion ?? 0) || 0;
        token.at = Date.now();
      } else {
        if (typeof token.sv !== 'number' && typeof prevSv === 'number') token.sv = prevSv;
        if (typeof token.at !== 'number' && typeof prevAt === 'number') token.at = prevAt;
      }
      return token;
    },
    async session(params) {
      const session = baseCallbacks.session ? await baseCallbacks.session(params) : params.session;
      if (session?.user) {
        const sv = (params.token as { sv?: number } | undefined)?.sv;
        (session.user as { sv?: number }).sv = typeof sv === 'number' ? sv : 0;
        const at = (params.token as { at?: number } | undefined)?.at;
        if (typeof at === 'number') (session.user as { at?: number }).at = at;
      }
      return session;
    },
  },
};

const LIVE_CHECKS = (process.env.AUTH_LIVE_CHECKS ?? 'on').toLowerCase() !== 'off';

/**
 * Current session, checked against the live account:
 *  - deleted / disabled users → null (treated as signed out)
 *  - "sign out everywhere" (sessionVersion bumped) → null
 *  - role / name / org always come from the database, so role changes apply now
 * If the database is unreachable the cookie session is used as before (fail-open).
 */
export async function auth() {
  const session = await getServerSession(authOptions);
  if (!LIVE_CHECKS || !session?.user?.id) return session;

  let state;
  try {
    state = await getAuthState(session.user.id);
  } catch (e) {
    console.error('[auth] live check failed, using cookie session:', e);
    return session;
  }

  if (!state) return null;
  if (state.status !== 'active') return null;
  if ((session.user.sv ?? 0) < state.sessionVersion) return null;

  // Session length (Settings → Security). Old cookies without a sign-in time
  // are left alone, so nobody is signed out by deploying this.
  const at = session.user.at;
  if (typeof at === 'number') {
    try {
      const { sessionMaxHours } = await getSettings();
      if (Date.now() - at > sessionMaxHours * 3_600_000) return null;
    } catch {
      /* fail-open */
    }
  }

  session.user.role = state.role;
  session.user.orgId = state.orgId;
  session.user.name = state.name;
  session.user.royal = state.royal;
  session.user.themePreset = state.themePreset;
  session.user.uiStyle = state.uiStyle;
  session.user.twoFactorEnabled = state.twoFactorEnabled;
  session.user.avatar = state.avatar;
  session.user.superAdmin = state.superAdmin;
  session.user.premiumUntil = state.premiumUntil;
  session.user.tokens = state.tokens;
  return session;
}

const nextAuthInstance = NextAuth(authOptions);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { signIn, signOut } = nextAuthInstance as any;

export default nextAuthInstance;

/** In-app alerts for a blocked sign-in (deduplicated per hour). Never throws. */
async function alertBlockedSignIn(orgId: string, userId: string, email: string, ip: string): Promise<void> {
  try {
    const { notify } = await import('./notifications');
    const hour = new Date().toISOString().slice(0, 13);
    await notify({
      orgId,
      userId,
      type: 'security.signin',
      title: 'Sign-in to your account was blocked',
      body: `Too many wrong passwords were tried for your account${ip ? ` (from ${ip})` : ''}. If this wasn't you, change your password and turn on two-step sign-in.`,
      link: '/profile?tab=security',
      email: true,
      dedupeKey: `blocked:${hour}`,
    });
    const admins = (await User.find({ orgId, role: 'admin', status: 'active', $or: [{ royal: true }, { superAdmin: true }] }).select('_id').limit(20).lean()) as { _id: unknown }[];
    for (const a of admins) {
      await notify({
        orgId,
        userId: String(a._id),
        type: 'system.alert',
        title: 'Sign-in blocked after repeated failures',
        body: `${email}${ip ? ` from ${ip}` : ''}. See Security for details.`,
        link: '/admin/security',
        dedupeKey: `blocked-admin:${userId}:${hour}`,
      });
    }
  } catch (e) {
    console.warn('[auth] blocked-sign-in alert failed', e);
  }
}
