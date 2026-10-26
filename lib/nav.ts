// =============================================================================
// FILE: lib/nav.ts   (UPDATED — client-safe)
// One navigation map used by the sidebar, the mobile bottom bar and the
// command palette, so they always agree.
//
// NEW: grouped, role-aware menu
//   Overview · Learning (Classes for staff) · Teaching · Community ·
//   Administration · Security & policy · Account
// Each item may require a permission from lib/rbac.ts (Royal / Super only
// items are hidden from others) and/or a feature switch. The server still
// checks every page — the menu only hides what you couldn't open anyway.
// =============================================================================

import type { Role } from './constants';
import { can, type Permission, type PermissionOverrides, type RbacUser } from './rbac';

export type FeatureKey = 'quizzes' | 'certificates' | 'queries' | 'gradebook' | 'premium';
export type Features = Record<FeatureKey, boolean>;

export type NavIcon =
  | 'dash'
  | 'programs'
  | 'sessions'
  | 'assignments'
  | 'quiz'
  | 'queries'
  | 'attendance'
  | 'award'
  | 'users'
  | 'shield'
  | 'settings'
  | 'bell'
  | 'user'
  | 'palette'
  | 'progress'
  | 'crown'
  | 'grading'
  | 'reports'
  | 'automation';

export type NavGroup = 'overview' | 'learning' | 'teaching' | 'community' | 'admin' | 'security' | 'account';

export const GROUP_LABEL: Record<NavGroup, string> = {
  overview: 'Overview',
  learning: 'Learning',
  teaching: 'Teaching',
  community: 'Community',
  admin: 'Administration',
  security: 'Security & policy',
  account: 'Account',
};

/** Group label for this user (staff see "Classes" instead of "Learning"). */
export function groupLabel(g: NavGroup, role: Role): string {
  if (g === 'learning' && role !== 'student') return 'Classes';
  return GROUP_LABEL[g];
}

export const GROUP_ORDER: NavGroup[] = ['overview', 'learning', 'teaching', 'community', 'admin', 'security', 'account'];

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: NavIcon;
  group: NavGroup;
  /** Minimum permission (lib/rbac.ts). */
  perm?: Permission;
  feature?: FeatureKey;
  /** extra words for the command palette search */
  keywords?: string;
};

const ALL: Role[] = ['admin', 'mentor', 'student'];
const STAFF: Role[] = ['admin', 'mentor'];

export const NAV: NavItem[] = [
  // overview
  { href: '/dashboard', label: 'Dashboard', roles: ALL, icon: 'dash', group: 'overview', keywords: 'home overview' },
  { href: '/progress', label: 'My progress', roles: ['student'], icon: 'progress', group: 'overview', keywords: 'streak achievements badges goals stats' },

  // learning / classes
  { href: '/programs', label: 'My programs', roles: ['mentor', 'student'], icon: 'programs', group: 'learning', keywords: 'courses syllabus' },
  { href: '/sessions', label: 'Sessions', roles: ALL, icon: 'sessions', group: 'learning', keywords: 'classes lectures schedule calendar' },
  { href: '/assignments', label: 'Assignments', roles: ALL, icon: 'assignments', group: 'learning', keywords: 'homework submissions grades' },
  { href: '/quizzes', label: 'Quizzes', roles: ALL, icon: 'quiz', group: 'learning', feature: 'quizzes', keywords: 'tests exams' },
  { href: '/attendance', label: 'Attendance', roles: ['student'], icon: 'attendance', group: 'learning', keywords: 'present absent history' },
  { href: '/certificates', label: 'Certificates', roles: ALL, icon: 'award', group: 'learning', feature: 'certificates', keywords: 'awards completion' },

  // teaching
  { href: '/grading', label: 'Grading queue', roles: STAFF, icon: 'grading', group: 'teaching', perm: 'grading.review', keywords: 'mark review submissions ai rubric feedback' },
  { href: '/attendance', label: 'Attendance', roles: STAFF, icon: 'attendance', group: 'teaching', perm: 'attendance.reports', keywords: 'present absent roster report low attendance' },

  // community
  { href: '/queries', label: 'Queries', roles: ALL, icon: 'queries', group: 'community', feature: 'queries', keywords: 'questions help ask' },
  { href: '/notifications', label: 'Notifications', roles: ALL, icon: 'bell', group: 'community', keywords: 'alerts inbox' },

  // administration
  { href: '/admin/programs', label: 'Programs', roles: ['admin'], icon: 'programs', group: 'admin', perm: 'programs.manage', keywords: 'courses cohorts' },
  { href: '/admin/users', label: 'Users', roles: ['admin'], icon: 'users', group: 'admin', perm: 'users.manage', keywords: 'students mentors admins people import' },
  { href: '/admin/reports', label: 'Reports', roles: ['admin'], icon: 'reports', group: 'admin', perm: 'reports.view', keywords: 'analytics export system health workload' },
  { href: '/admin/automation', label: 'Account automation', roles: ['admin'], icon: 'automation', group: 'admin', perm: 'automation.view', keywords: 'inactive inactivity suspend flag remind' },
  { href: '/admin/premium', label: 'Premium', roles: ['admin'], icon: 'crown', group: 'admin', perm: 'premium.view', feature: 'premium', keywords: 'membership codes members themes' },

  // security & policy
  { href: '/admin/security', label: 'Security', roles: ['admin'], icon: 'shield', group: 'security', perm: 'security.view', keywords: 'audit logs royal super' },
  { href: '/admin/settings', label: 'Settings', roles: ['admin'], icon: 'settings', group: 'security', perm: 'settings.edit', keywords: 'theme branding appearance style features policy' },

  // account (user menu + palette)
  { href: '/premium', label: 'Premium', roles: ALL, icon: 'crown', group: 'account', feature: 'premium', keywords: 'upgrade membership themes deluxe' },
  { href: '/profile', label: 'Profile', roles: ALL, icon: 'user', group: 'account', keywords: 'account password name avatar' },
  { href: '/profile?tab=appearance', label: 'My appearance', roles: ALL, icon: 'palette', group: 'account', keywords: 'theme style dark light colors personal' },
  { href: '/profile?tab=security', label: 'Security & sign-in', roles: ALL, icon: 'shield', group: 'account', keywords: 'two-step 2fa authenticator password sessions' },
];

export type NavUser = RbacUser & { role: Role };

export function visibleNav(user: NavUser, features?: Partial<Features>, overrides?: PermissionOverrides | null): NavItem[] {
  return NAV.filter(
    (n) =>
      n.roles.includes(user.role) &&
      (!n.perm || can(user, n.perm, overrides)) &&
      (!n.feature || !features || features[n.feature] !== false) &&
      // premium is opt-in: hidden unless explicitly switched on
      (n.feature !== 'premium' || features?.premium === true)
  );
}

/** Menu items grouped in display order (empty groups dropped). */
export function groupedNav(items: NavItem[]): { group: NavGroup; items: NavItem[] }[] {
  return GROUP_ORDER.map((g) => ({ group: g, items: items.filter((i) => i.group === g) })).filter((g) => g.items.length);
}

/** Up to 4 shortcuts for the mobile bottom bar (the 5th button opens the menu). */
export function mobileNav(user: NavUser, features?: Partial<Features>): NavItem[] {
  const pick =
    user.role === 'admin'
      ? ['/dashboard', '/admin/users', '/sessions', '/grading']
      : user.role === 'mentor'
        ? ['/dashboard', '/sessions', '/grading', '/attendance']
        : ['/dashboard', '/sessions', '/assignments', '/progress'];
  const items = visibleNav(user, features);
  const out = pick.map((h) => items.find((n) => n.href === h)).filter((n): n is NavItem => !!n);
  for (const f of ['/quizzes', '/certificates', '/attendance']) {
    if (out.length >= 4) break;
    const it = items.find((n) => n.href === f);
    if (it && !out.includes(it)) out.push(it);
  }
  return out.slice(0, 4);
}

export function isActivePath(pathname: string, href: string): boolean {
  const path = href.split('?')[0];
  if (path === '/dashboard') return pathname === '/dashboard';
  if (path === '/profile') return pathname === '/profile';
  return pathname === path || pathname.startsWith(path + '/');
}

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  assignments: 'Assignments',
  queries: 'Queries',
  attendance: 'Attendance',
  programs: 'Programs',
  users: 'Users',
  settings: 'Settings',
  profile: 'Profile',
  notifications: 'Notifications',
  quizzes: 'Quizzes',
  certificates: 'Certificates',
  security: 'Security',
  progress: 'My progress',
  premium: 'Premium',
  grading: 'Grading',
  reports: 'Reports',
  automation: 'Account automation',
};

const SUB_TITLES: Record<string, string> = {
  new: 'New',
  import: 'Import',
  attendance: 'Attendance',
  materials: 'Materials',
  audit: 'Audit log',
  results: 'Results',
  syllabus: 'Syllabus',
  gradebook: 'Gradebook',
  certificates: 'Certificates',
  edit: 'Edit',
  attempt: 'Attempt',
  codes: 'Codes',
  rules: 'Rules',
  flags: 'Flags',
  review: 'Review',
  ai: 'AI setup',
  history: 'History',
};

/** "/admin/users/new" → { title: "Users", crumb: "New" } */
export function pageTitle(pathname: string): { title: string; crumb: string } {
  const seg = pathname.split('/').filter(Boolean).filter((s) => s !== 'admin');
  const title = TITLES[seg[0] ?? ''] ?? 'Dashboard';
  let crumb = '';
  for (let i = seg.length - 1; i >= 1; i--) {
    if (SUB_TITLES[seg[i]]) {
      crumb = SUB_TITLES[seg[i]];
      break;
    }
  }
  if (!crumb && seg.length > 1) crumb = 'Details';
  return { title, crumb };
}
