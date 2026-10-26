// =============================================================================
// FILE: lib/progress-core.ts   (NEW FILE — pure, client-safe)
// Weekly streaks and achievements (no database — unit-testable).
// =============================================================================

/** ISO week key, e.g. "2026-W43" (weeks start on Monday, UTC). */
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t.getTime() - y.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}

/**
 * Streak of consecutive active weeks. The current week doesn't break the
 * streak while it is still in progress (counting continues from last week).
 * Also returns the last 12 weeks for a small calendar strip.
 */
export function weeklyStreak(active: Set<string>, now: Date): { current: number; best: number; thisWeekActive: boolean; weeks: { key: string; active: boolean }[] } {
  const keys: string[] = [];
  for (let i = 0; i < 104; i++) keys.push(weekKey(new Date(now.getTime() - i * 7 * 86_400_000)));
  const thisWeekActive = active.has(keys[0]);
  let current = 0;
  for (let i = thisWeekActive ? 0 : 1; i < keys.length; i++) {
    if (active.has(keys[i])) current++;
    else break;
  }
  let best = 0;
  let run = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    if (active.has(keys[i])) best = Math.max(best, ++run);
    else run = 0;
  }
  return { current, best: Math.max(best, current), thisWeekActive, weeks: keys.slice(0, 12).reverse().map((k) => ({ key: k, active: active.has(k) })) };
}

export type Achievement = { id: string; title: string; description: string; icon: string; earned: boolean; progress: number; goal: number };

export type AchievementFacts = {
  submissions: number;
  perfectScores: number;
  onTimeRun: number;
  attendanceRate: number | null;
  sessionsMarked: number;
  bestQuiz: number | null;
  quizzesPassed: number;
  bestStreak: number;
  certificates: number;
};

export function computeAchievements(f: AchievementFacts): Achievement[] {
  const a = (id: string, title: string, description: string, icon: string, progress: number, goal: number): Achievement => ({
    id,
    title,
    description,
    icon,
    progress: Math.min(progress, goal),
    goal,
    earned: progress >= goal,
  });
  const att = f.attendanceRate !== null && f.sessionsMarked >= 5 ? Math.round(f.attendanceRate * 100) : 0;
  return [
    a('first-step', 'First step', 'Submit your first assignment', '🌱', f.submissions, 1),
    a('steady', 'Steady worker', 'Submit 10 assignments', '📚', f.submissions, 10),
    a('scholar', 'Scholar', 'Submit 25 assignments', '🎓', f.submissions, 25),
    a('perfect', 'Perfect score', 'Get full marks on an assignment', '💯', f.perfectScores, 1),
    a('on-time', 'Always on time', 'Hand in 5 assignments on time in a row', '⏰', f.onTimeRun, 5),
    a('present', 'Present & proud', '90%+ attendance over at least 5 sessions', '🙋', att, 90),
    a('quiz-whiz', 'Quiz whiz', 'Score 90% or more on a quiz', '🧠', f.bestQuiz === null ? 0 : Math.round(f.bestQuiz), 90),
    a('quiz-five', 'Quiz streak', 'Pass 5 quizzes', '✅', f.quizzesPassed, 5),
    a('streak-4', 'On a roll', 'Learn 4 weeks in a row', '🔥', f.bestStreak, 4),
    a('streak-12', 'Unstoppable', 'Learn 12 weeks in a row', '🚀', f.bestStreak, 12),
    a('certified', 'Certified', 'Earn a certificate', '🏅', f.certificates, 1),
  ];
}
