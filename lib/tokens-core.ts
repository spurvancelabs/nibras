// =============================================================================
// FILE: lib/tokens-core.ts   (NEW FILE — pure, client-safe)
// Token currency rules shared by Settings (labels), the server (rewards)
// and tests.
// =============================================================================

export type TokenRuleKey =
  | 'attendancePresent'
  | 'attendanceLate'
  | 'submissionOnTime'
  | 'submissionLate'
  | 'highGrade'
  | 'quizPassed'
  | 'quizPerfect'
  | 'lessonComplete'
  | 'courseComplete'
  | 'weeklyStreak';

export const TOKEN_RULES: { key: TokenRuleKey; label: string; hint: string }[] = [
  { key: 'attendancePresent', label: 'Attended a session', hint: 'Marked present' },
  { key: 'attendanceLate', label: 'Attended late', hint: 'Marked late' },
  { key: 'submissionOnTime', label: 'Submitted on time', hint: 'Once per assignment' },
  { key: 'submissionLate', label: 'Submitted late', hint: 'Once per assignment' },
  { key: 'highGrade', label: 'Grade of 90% or more', hint: 'When the grade is approved' },
  { key: 'quizPassed', label: 'Passed a quiz', hint: 'First pass of each quiz' },
  { key: 'quizPerfect', label: 'Perfect quiz score', hint: 'Extra, once per quiz' },
  { key: 'lessonComplete', label: 'Finished a course lesson', hint: 'Once per lesson' },
  { key: 'courseComplete', label: 'Finished a whole course', hint: 'Once per course' },
  { key: 'weeklyStreak', label: 'Learning streak week', hint: 'Each new active week in a row' },
];

export type TxKind = 'earn' | 'grant' | 'deduct' | 'spend' | 'refund' | 'transfer_in' | 'transfer_out';

export const TX_LABEL: Record<TxKind, string> = {
  earn: 'Earned',
  grant: 'Given by admin',
  deduct: 'Removed by admin',
  spend: 'Spent',
  refund: 'Refunded',
  transfer_in: 'Received',
  transfer_out: 'Sent',
};

/** How much of `amount` can still be earned today under the daily cap. */
export function capAmount(amount: number, earnedToday: number, dailyCap: number): number {
  if (amount <= 0) return 0;
  if (dailyCap <= 0) return 0;
  return Math.max(0, Math.min(amount, dailyCap - earnedToday));
}

export function formatTokens(n: number, icon = '🪙'): string {
  return `${icon} ${Math.round(n).toLocaleString('en-US')}`;
}
