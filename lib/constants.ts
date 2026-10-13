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

export const SUBMISSION_STATES = [
  'pending',
  'submitted',
  'graded',
  'overdue',
] as const;
export type SubmissionState = (typeof SUBMISSION_STATES)[number];

export const QUERY_STATUSES = ['open', 'resolved'] as const;
export type QueryStatus = (typeof QUERY_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'assignment.new',
  'assignment.graded',
  'assignment.due_soon',
  'material.new',
  'session.new',
  'query.new',
  'query.reply',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'late',
  'excused',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];