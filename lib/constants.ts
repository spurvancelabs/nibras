/**
 * Shared constants and primitive types.
 * MUST stay free of any server-only imports (no mongoose, no 'server-only', no fs).
 * Client components import from here — never from @/models/*.
 */

export const ROLES = ['admin', 'mentor', 'student'] as const;
export type Role = (typeof ROLES)[number];

export const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PROGRAM_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const MATERIAL_KINDS = ['slide', 'doc', 'link'] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];