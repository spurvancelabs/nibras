'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignment,
  canManageProgramAssignments,
} from '@/lib/assignments';
import {
  submitAssignment,
  gradeSubmission,
  ungradeSubmission,
  getSubmissionById,
} from '@/lib/submissions';
import { deleteCloudinaryAsset } from '@/lib/cloudinary-server';
import { notify, notifyMany } from '@/lib/notifications';
import Program from '@/models/Program';
import User from '@/models/User';

const attachmentSchema = z.object({
  url: z.string().min(1).max(1000),
  publicId: z.string().max(500).optional().default(''),
  resourceType: z.string().max(50).optional().default('image'),
  format: z.string().max(20).optional().default(''),
  size: z.number().nonnegative().optional().default(0),
  originalName: z.string().max(300).optional().default(''),
});

const upsertSchema = z
  .object({
    id: z.string().optional(),
    programId: z.string().min(1),
    sessionId: z.string().nullable().optional(),
    title: z.string().min(1).max(200),
    description: z.string().max(4000).optional().default(''),
    dueAt: z.string().min(1),
    maxMarks: z.number().int().min(1).max(10000),
    allowLate: z.boolean().optional().default(true),
    attachments: z.array(attachmentSchema).max(20).optional().default([]),
  })
  .refine((v) => !isNaN(Date.parse(v.dueAt)), {
    message: 'Invalid due date',
    path: ['dueAt'],
  });

const deleteSchema = z.object({ id: z.string().min(1) });

const submitSchema = z.object({
  assignmentId: z.string().min(1),
  text: z.string().max(5000).optional().default(''),
  attachments: z.array(attachmentSchema).max(20).optional().default([]),
});

const gradeSchema = z.object({
  submissionId: z.string().min(1),
  marks: z.number().min(0),
  feedback: z.string().max(4000).optional().default(''),
});

const submissionIdSchema = z.object({ submissionId: z.string().min(1) });

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function saveAssignmentAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };

  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const data = parsed.data;

  const canWrite = await canManageProgramAssignments(
    user.orgId,
    user,
    data.programId
  );
  if (!canWrite) return { ok: false, error: 'Not allowed for this program' };

  if (data.id) {
    const existing = await getAssignment(user.orgId, data.id);
    if (!existing) return { ok: false, error: 'Assignment not found' };
    const canEditExisting = await canManageProgramAssignments(
      user.orgId,
      user,
      existing.programId
    );
    if (!canEditExisting) return { ok: false, error: 'Not allowed' };

    const res = await updateAssignment(user.orgId, data.id, {
      title: data.title,
      description: data.description,
      dueAt: data.dueAt,
      maxMarks: data.maxMarks,
      allowLate: data.allowLate,
      attachments: data.attachments,
    });
    if (!res.ok) return res;

    revalidatePath('/assignments');
    revalidatePath(`/assignments/${data.id}`);
    revalidatePath('/dashboard');
    return { ok: true, id: data.id };
  }

  const res = await createAssignment({
    orgId: user.orgId,
    programId: data.programId,
    sessionId: data.sessionId ?? null,
    title: data.title,
    description: data.description,
    dueAt: data.dueAt,
    maxMarks: data.maxMarks,
    allowLate: data.allowLate,
    attachments: data.attachments,
    createdBy: user.id,
  });
  if (!res.ok) return res;

  // Notify students in the program
  const program = await Program.findOne({
    _id: data.programId,
    orgId: user.orgId,
  })
    .select('students name')
    .lean();
  const studentIds = (program?.students ?? []).map(String);
  if (studentIds.length > 0) {
    const dueLabel = new Date(data.dueAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    await notifyMany({
      orgId: user.orgId,
      userIds: studentIds,
      type: 'assignment.new',
      title: `New assignment: ${data.title}`,
      body: `In ${program?.name ?? 'your program'}. Due ${dueLabel}.`,
      link: `/assignments/${res.id}`,
      email: true,
    });
  }

  revalidatePath('/assignments');
  revalidatePath('/dashboard');
  return { ok: true, id: res.id };
}

export async function deleteAssignmentAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };

  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const existing = await getAssignment(user.orgId, parsed.data.id);
  if (!existing) return { ok: false, error: 'Assignment not found' };

  const can = await canManageProgramAssignments(
    user.orgId,
    user,
    existing.programId
  );
  if (!can) return { ok: false, error: 'Not allowed' };

  for (const a of existing.attachments) {
    if (a.publicId) {
      await deleteCloudinaryAsset(
        a.publicId,
        (a.resourceType as 'image' | 'raw' | 'video') ?? 'image'
      );
    }
  }

  const res = await deleteAssignment(user.orgId, parsed.data.id);
  if (!res.ok) return res;

  revalidatePath('/assignments');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function submitAssignmentAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role !== 'student') return { ok: false, error: 'Only students submit' };

  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const assignment = await getAssignment(user.orgId, parsed.data.assignmentId);
  if (!assignment) return { ok: false, error: 'Assignment not found' };

  const res = await submitAssignment({
    orgId: user.orgId,
    assignmentId: parsed.data.assignmentId,
    studentId: user.id,
    text: parsed.data.text,
    attachments: parsed.data.attachments,
  });
  if (!res.ok) return res;

  // Notify mentors of the program
  const program = await Program.findOne({
    _id: assignment.programId,
    orgId: user.orgId,
  })
    .select('mentors name')
    .lean();
  const mentorIds = (program?.mentors ?? [] as unknown[]).map(String);
  if (mentorIds.length > 0) {
    await notifyMany({
      orgId: user.orgId,
      userIds: mentorIds,
      type: 'assignment.new',
      title: `New submission: ${assignment.title}`,
      body: `${user.name ?? 'A student'} submitted for ${program?.name ?? 'your program'}.`,
      link: `/assignments/${assignment.id}`,
      email: false,
    });
  }

  revalidatePath(`/assignments/${parsed.data.assignmentId}`);
  revalidatePath('/assignments');
  revalidatePath('/dashboard');
  return { ok: true, id: res.id };
}

export async function gradeSubmissionAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };

  const parsed = gradeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const temp = await getSubmissionById(
    user.orgId,
    parsed.data.submissionId,
    new Date(0),
    0
  );
  if (!temp) return { ok: false, error: 'Submission not found' };

  const assignment = await getAssignment(user.orgId, temp.assignmentId);
  if (!assignment) return { ok: false, error: 'Assignment not found' };

  const can = await canManageProgramAssignments(
    user.orgId,
    user,
    assignment.programId
  );
  if (!can) return { ok: false, error: 'Not allowed' };

  const res = await gradeSubmission({
    orgId: user.orgId,
    submissionId: parsed.data.submissionId,
    marks: parsed.data.marks,
    feedback: parsed.data.feedback,
    gradedBy: user.id,
  });
  if (!res.ok) return res;

  // Notify the student
  await notify({
    orgId: user.orgId,
    userId: temp.studentId,
    type: 'assignment.graded',
    title: `Graded: ${assignment.title}`,
    body: `You scored ${parsed.data.marks}/${assignment.maxMarks}.${
      parsed.data.feedback ? `\n\nFeedback: ${parsed.data.feedback}` : ''
    }`,
    link: `/assignments/${assignment.id}`,
    email: true,
    dedupeKey: `graded:${parsed.data.submissionId}:${Date.now()}`,
  });

  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath('/assignments');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function ungradeSubmissionAction(raw: unknown): Promise<ActionResult> {
  const user = await requireAuth();
  if (user.role === 'student') return { ok: false, error: 'Not allowed' };

  const parsed = submissionIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  const temp = await getSubmissionById(
    user.orgId,
    parsed.data.submissionId,
    new Date(0),
    0
  );
  if (!temp) return { ok: false, error: 'Submission not found' };

  const assignment = await getAssignment(user.orgId, temp.assignmentId);
  if (!assignment) return { ok: false, error: 'Assignment not found' };

  const can = await canManageProgramAssignments(
    user.orgId,
    user,
    assignment.programId
  );
  if (!can) return { ok: false, error: 'Not allowed' };

  const res = await ungradeSubmission(user.orgId, parsed.data.submissionId);
  if (!res.ok) return res;

  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath('/assignments');
  return { ok: true };
}