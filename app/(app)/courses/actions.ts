'use server';

// =============================================================================
// FILE: app/(app)/courses/actions.ts   (NEW FILE)
// Learner actions for video courses: enrol and mark lessons complete.
// All access rules live in lib/courses.ts.
// =============================================================================

import { z } from 'zod';
import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import { enroll, completeLesson } from '@/lib/courses';
import { hit } from '@/lib/rate-limit';
import type { ActionResult } from '@/lib/reauth-shared';

const idSchema = z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid id');

export async function enrollAction(raw: unknown): Promise<ActionResult<{ slug: string; firstLesson: string }>> {
  const user = await requireAuth();
  const s = await getSettings();
  if (s.featureCourses === false) return { ok: false, error: 'Courses are turned off.' };
  const p = z.object({ courseId: idSchema }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid course' };
  if ((await hit(`course-enroll:${user.id}`, 60)) > 20) return { ok: false, error: 'Too many tries — wait a minute.' };
  const r = await enroll(user, p.data.courseId);
  if (r.ok) {
    revalidatePath('/courses');
    revalidatePath(`/courses/${r.slug}`);
  }
  return r;
}

export async function completeLessonAction(raw: unknown): Promise<ActionResult<{ percent: number; completedCourse: boolean }>> {
  const user = await requireAuth();
  const p = z.object({ courseId: idSchema, lessonId: z.string().min(1).max(40) }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid lesson' };
  if ((await hit(`course-complete:${user.id}`, 60)) > 60) return { ok: false, error: 'Slow down a little.' };
  return completeLesson(user, p.data.courseId, p.data.lessonId);
}
