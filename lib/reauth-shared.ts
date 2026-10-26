// =============================================================================
// FILE: lib/reauth-shared.ts   (NEW FILE — client-safe)
// Error code a server action returns when it needs the user to confirm their
// identity first (see lib/sudo.ts and components/feedback.tsx useSudo()).
// =============================================================================

export const REAUTH_REQUIRED = 'REAUTH_REQUIRED';

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
