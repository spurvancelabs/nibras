// =============================================================================
// FILE: lib/rbac.ts   (NEW FILE — client-safe)
// ONE permission table for the whole LMS (role-based access control).
//
// Levels (each includes everything below it):
//   student  <  mentor  <  admin (Program Administrator)  <  royal (Royal Admin)
//   <  super (Super Admin)
//
//   - mentor/admin rights over a PROGRAM are still scoped by program checks
//     (e.g. a mentor only grades programs they teach) — this table answers
//     "may this KIND of user do this at all?".
//   - The server is always the authority: pages use requirePermission(),
//     actions use hasPermission() (lib/auth-helpers.ts). The menu only hides
//     what you couldn't open anyway.
//   - A few delegations can be changed by the Super Admin in Settings
//     (see DELEGABLE) instead of being hard-coded.
// =============================================================================

export type Level = 'student' | 'mentor' | 'admin' | 'royal' | 'super';

export const LEVEL_RANK: Record<Level, number> = { student: 0, mentor: 1, admin: 2, royal: 3, super: 4 };

export const LEVEL_LABEL: Record<Level, string> = {
  student: 'Learner',
  mentor: 'Mentor',
  admin: 'Program Administrator',
  royal: 'Royal Admin',
  super: 'Super Admin',
};

export const PERMISSIONS = {
  // learning
  'learning.view': 'student',
  'progress.own': 'student',
  // teaching
  'attendance.mark': 'mentor',
  'attendance.reports': 'mentor',
  'grading.review': 'mentor',
  'grading.ai.use': 'mentor',
  // administration
  'users.manage': 'admin',
  'programs.manage': 'admin',
  'reports.view': 'admin',
  'exports.data': 'admin',
  'settings.edit': 'admin',
  'automation.view': 'admin',
  'automation.review': 'admin',
  'premium.view': 'admin',
  'courses.manage': 'admin',
  'tokens.view': 'admin',
  'tokens.grant': 'royal',
  'registration.approve': 'admin',
  'premium.grant': 'royal',
  'premium.codes': 'royal',
  'themes.entitlements': 'royal',
  // high privilege
  'admins.manage': 'royal',
  'audit.view': 'royal',
  'security.view': 'royal',
  'settings.security': 'royal',
  'settings.maintenance': 'royal',
  // global policy (Super Admin)
  'premium.policy': 'super',
  'automation.configure': 'super',
  'automation.run': 'super',
  'ai.configure': 'super',
  'retention.configure': 'super',
  'super.manage': 'super',
  'registration.configure': 'super',
  'tokens.configure': 'super',
} as const satisfies Record<string, Level>;

export type Permission = keyof typeof PERMISSIONS;

/** Permissions whose minimum level the Super Admin may change in Settings. */
export const DELEGABLE: Partial<Record<Permission, Level[]>> = {
  'premium.grant': ['admin', 'royal', 'super'],
  'premium.codes': ['admin', 'royal', 'super'],
  'themes.entitlements': ['admin', 'royal', 'super'],
  'automation.review': ['admin', 'royal', 'super'],
  'courses.manage': ['mentor', 'admin', 'royal', 'super'],
  'tokens.grant': ['admin', 'royal', 'super'],
};

export type PermissionOverrides = Partial<Record<Permission, Level>>;

export type RbacUser = { role: string; royal?: boolean | null; superAdmin?: boolean | null };

export function levelOf(u: RbacUser | null | undefined): Level {
  if (!u) return 'student';
  if (u.role === 'admin') {
    if (u.superAdmin) return 'super';
    if (u.royal) return 'royal';
    return 'admin';
  }
  if (u.role === 'mentor') return 'mentor';
  return 'student';
}

export function atLeast(u: RbacUser | null | undefined, level: Level): boolean {
  return LEVEL_RANK[levelOf(u)] >= LEVEL_RANK[level];
}

/** Minimum level for a permission, honouring valid Super-Admin overrides. */
export function requiredLevel(perm: Permission, overrides?: PermissionOverrides | null): Level {
  const o = overrides?.[perm];
  const allowed = DELEGABLE[perm];
  if (o && allowed && allowed.includes(o)) return o;
  return PERMISSIONS[perm];
}

export function can(u: RbacUser | null | undefined, perm: Permission, overrides?: PermissionOverrides | null): boolean {
  return atLeast(u, requiredLevel(perm, overrides));
}
