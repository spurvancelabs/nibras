// =============================================================================
// FILE: lib/audit-query.ts   (NEW FILE)
// Turns audit-log URL parameters into a safe AuditQuery (page + CSV export).
// =============================================================================

import { AUDIT_LABELS, AUDIT_GROUPS, type AuditQuery } from './audit';
import { parseLocalDateTime } from './time';

export function parseAuditQuery(sp: Record<string, string | undefined>): { q: AuditQuery; clean: Record<string, string | undefined> } {
  const action = sp.action && sp.action in AUDIT_LABELS ? sp.action : undefined;
  const group = AUDIT_GROUPS.some((g) => g.prefix === sp.group) ? sp.group : undefined;
  const user = /^[a-f0-9]{24}$/i.test(sp.user ?? '') ? sp.user : undefined;
  const ip = /^[0-9a-fA-F:.]{3,64}$/.test(sp.ip ?? '') ? sp.ip : undefined;
  const text = (sp.q ?? '').trim().slice(0, 80) || undefined;
  const from = parseLocalDateTime(sp.from) ?? undefined;
  const toDay = parseLocalDateTime(sp.to);
  const to = toDay ? new Date(toDay.getTime() + 864e5) : undefined; // inclusive end date
  return {
    q: { action, group, targetId: user, ip, search: text, from, to },
    clean: { action, group, user, ip, q: text, from: from ? sp.from : undefined, to: toDay ? sp.to : undefined },
  };
}

