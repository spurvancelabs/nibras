'use server';

// =============================================================================
// FILE: app/(app)/admin/courses/actions.ts   (NEW FILE)
// Create / edit / delete video courses. Needs `courses.manage`
// (Program Administrators; mentors when delegated). Mentors may only edit
// courses they created or teach — checked in lib/courses.ts.
// =============================================================================

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth-helpers';
import { saveCourse, deleteCourse } from '@/lib/courses';
import type { ActionResult } from '@/lib/reauth-shared';

const url = z.string().max(1000);
const lesson = z.object({
  id: z.string().max(40),
  title: z.string().max(200),
  type: z.enum(['video', 'article']),
  videoUrl: url,
  duration: z.number().min(0).max(86400),
  body: z.string().max(20000),
  resources: z.array(z.object({ title: z.string().max(200), url: url.min(1), format: z.string().max(12), size: z.number().min(0).max(5e9) })).max(20),
  preview: z.boolean(),
});
const schema = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(3, 'Give the course a title (3+ characters).').max(200),
  slug: z.string().max(90),
  subtitle: z.string().max(300),
  description: z.string().max(10000),
  cover: url,
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all']),
  category: z.string().max(60),
  status: z.enum(['draft', 'published', 'archived']),
  access: z.enum(['free', 'premium', 'tokens']),
  tokenPrice: z.number().int().min(0).max(1_000_000),
  programIds: z.array(z.string().max(40)).max(100),
  instructorIds: z.array(z.string().max(40)).max(20),
  sections: z.array(z.object({ id: z.string().max(40), title: z.string().max(200), lessons: z.array(lesson).max(200) })).max(50),
});

export async function saveCourseAction(raw: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  const user = await requirePermission('courses.manage');
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Check the form.' };
  const { id, ...input } = p.data;
  if (input.access === 'tokens' && input.tokenPrice < 1) return { ok: false, error: 'Set a token price of at least 1.' };
  const r = await saveCourse(user, input, id);
  if (r.ok) {
    revalidatePath('/courses');
    revalidatePath('/admin/courses');
    revalidatePath(`/courses/${r.slug}`);
  }
  return r;
}

export async function deleteCourseAction(raw: unknown): Promise<ActionResult<{ archived: boolean }>> {
  const user = await requirePermission('courses.manage');
  const p = z.object({ id: z.string().max(40) }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'Invalid course' };
  const r = await deleteCourse(user, p.data.id);
  if (r.ok) {
    revalidatePath('/courses');
    revalidatePath('/admin/courses');
  }
  return r;
}
