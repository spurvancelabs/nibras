// =============================================================================
// FILE: lib/nav.ts   (NEW FILE — client-safe)
// One navigation map used by the sidebar, the mobile bottom bar and the
// command palette, so they always agree (roles, royal-only, feature switches).
// =============================================================================

import type { Role } from './constants';

export type FeatureKey = 'quizzes' | 'certificates' | 'queries' | 'gradebook';
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
  | 'palette';

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: NavIcon;
  group: 'learn' | 'manage' | 'account';
  royalOnly?: boolean;
  feature?: FeatureKey;
  /** extra words for the command palette search */
  keywords?: string;
};

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'mentor', 'student'], icon: 'dash', group: 'learn', keywords: 'home overview' },
  { href: '/programs', label: 'My programs', roles: ['mentor', 'student'], icon: 'programs', group: 'learn', keywords: 'courses syllabus' },
  { href: '/sessions', label: 'Sessions', roles: ['admin', 'mentor', 'student'], icon: 'sessions', group: 'learn', keywords: 'classes lectures schedule calendar' },
  { href: '/assignments', label: 'Assignments', roles: ['admin', 'mentor', 'student'], icon: 'assignments', group: 'learn', keywords: 'homework submissions grades' },
  { href: '/quizzes', label: 'Quizzes', roles: ['admin', 'mentor', 'student'], icon: 'quiz', group: 'learn', feature: 'quizzes', keywords: 'tests exams' },
  { href: '/queries', label: 'Queries', roles: ['admin', 'mentor', 'student'], icon: 'queries', group: 'learn', feature: 'queries', keywords: 'questions help ask' },
  { href: '/attendance', label: 'Attendance', roles: ['student'], icon: 'attendance', group: 'learn', keywords: 'present absent' },
  { href: '/certificates', label: 'Certificates', roles: ['admin', 'mentor', 'student'], icon: 'award', group: 'learn', feature: 'certificates', keywords: 'awards completion' },
  { href: '/admin/programs', label: 'Programs', roles: ['admin'], icon: 'programs', group: 'manage', keywords: 'courses cohorts' },
  { href: '/admin/users', label: 'Users', roles: ['admin'], icon: 'users', group: 'manage', keywords: 'students mentors admins people import' },
  { href: '/admin/security', label: 'Security', roles: ['admin'], icon: 'shield', group: 'manage', royalOnly: true, keywords: 'audit logs royal' },
  { href: '/admin/settings', label: 'Settings', roles: ['admin'], icon: 'settings', group: 'manage', keywords: 'theme branding appearance style features' },
  { href: '/notifications', label: 'Notifications', roles: ['admin', 'mentor', 'student'], icon: 'bell', group: 'account', keywords: 'alerts inbox' },
  { href: '/profile', label: 'Profile', roles: ['admin', 'mentor', 'student'], icon: 'user', group: 'account', keywords: 'account password name avatar' },
  { href: '/profile?tab=appearance', label: 'My appearance', roles: ['admin', 'mentor', 'student'], icon: 'palette', group: 'account', keywords: 'theme style dark light colors personal' },
  { href: '/profile?tab=security', label: 'Security & sign-in', roles: ['admin', 'mentor', 'student'], icon: 'shield', group: 'account', keywords: 'two-step 2fa authenticator password sessions' },
];

export function visibleNav(role: Role, royal: boolean, features?: Partial<Features>): NavItem[] {
  return NAV.filter(
    (n) => n.roles.includes(role) && (!n.royalOnly || royal) && (!n.feature || !features || features[n.feature] !== false)
  );
}

/** Up to 4 shortcuts for the mobile bottom bar (the 5th button opens the menu). */
export function mobileNav(role: Role, features?: Partial<Features>): NavItem[] {
  const pick =
    role === 'admin'
      ? ['/dashboard', '/admin/programs', '/admin/users', '/sessions']
      : role === 'mentor'
        ? ['/dashboard', '/sessions', '/assignments', '/quizzes']
        : ['/dashboard', '/sessions', '/assignments', '/quizzes'];
  const items = visibleNav(role, false, features);
  const out = pick.map((h) => items.find((n) => n.href === h)).filter((n): n is NavItem => !!n);
  if (out.length < 4) {
    const fallback = items.find((n) => n.href === '/certificates' || n.href === '/attendance');
    if (fallback && !out.includes(fallback)) out.push(fallback);
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
