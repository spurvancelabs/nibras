// =============================================================================
// FILE: app/(app)/programs/actions.ts   (NEW FILE)
// Syllabus, certificate rules, issue / revoke certificates.
// Issuing & revoking certificates is for ADMINS only (official documents).
// =============================================================================

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-helpers';
import { hubAccess, saveSyllabus } from '@/lib/program-hub';
import { saveCertConfig, issueCertificates, revokeCertificate } from '@/lib/certificates';
import { auditBy } from '@/lib/audit';
import { notify } from '@/lib/notifications';
import { sendEmails } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { db } from '@/lib/db';
import User from '@/models/User';

const idField = z.string().regex(/^[a-f0-9]{24}$/i);
const strList = (max: number, len: number) => z.array(z.string().max(len)).max(max);

const syllabusSchema = z.object({
  programId: idField,
  data: z.object({
    overview: z.string().max(6000),
    outcomes: strList(30, 300),
    prerequisites: strList(20, 300),
    assessment: z.string().max(3000),
    updatedAt: z.string().nullable().optional(),
    modules: z
      .array(
        z.object({
          id: z.string().max(24).optional(),
          title: z.string().max(200),
          weekLabel: z.string().max(60),
          summary: z.string().max(3000),
          topics: strList(40, 300),
          sessionIds: z.array(z.string().max(24)).max(50),
          resources: z.array(z.object({ title: z.string().max(200), url: z.string().max(500) })).max(20),
        })
      )
      .max(60),
  }),
});

const certCfgSchema = z.object({
  programId: idField,
  cfg: z.object({
    title: z.string().max(80),
    statement: z.string().max(200),
    style: z.enum(['classic', 'modern', 'elegant']),
    signatoryName: z.string().max(80),
    signatoryTitle: z.string().max(80),
    signatureImage: z.string().max(500),
    minAttendance: z.number().min(0).max(100),
    minAssignments: z.number().min(0).max(100),
    minQuizzes: z.number().min(0).max(100),
    showScores: z.boolean(),
  }),
});

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function saveSyllabusAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  const parsed = syllabusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid syllabus' };
  if ((await getSettings()).featureSyllabus === false) return { ok: false, error: 'Syllabus is turned off in Settings' };
  if ((await hubAccess(user.orgId, user, parsed.data.programId)) !== 'manage') return { ok: false, error: 'Not allowed' };
  const res = await saveSyllabus(user.orgId, user.id, parsed.data.programId, { ...parsed.data.data, updatedAt: null });
  await auditBy(user, 'syllabus.update', `${res.modules} module${res.modules === 1 ? '' : 's'}`, [], { programId: parsed.data.programId });
  revalidatePath(`/programs/${parsed.data.programId}`);
  return { ok: true };
}

export async function saveCertConfigAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  if (user.role !== 'admin') return { ok: false, error: 'Only admins can change certificate rules' };
  const parsed = certCfgSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid settings' };
  if ((await hubAccess(user.orgId, user, parsed.data.programId)) !== 'manage') return { ok: false, error: 'Not allowed' };
  await saveCertConfig(user.orgId, parsed.data.programId, parsed.data.cfg);
  await auditBy(user, 'program.update', 'Certificate design / rules updated', [], { programId: parsed.data.programId, ...parsed.data.cfg });
  revalidatePath(`/programs/${parsed.data.programId}/certificates`);
  return { ok: true };
}

export async function issueCertificatesAction(
  raw: unknown
): Promise<R<{ issued: number; skipped: { name: string; reason: string }[] }>> {
  const user = await requireAuth();
  if (user.role !== 'admin') return { ok: false, error: 'Only admins can issue certificates' };
  const settings = await getSettings();
  if (settings.featureCertificates === false) return { ok: false, error: 'Certificates are turned off in Settings' };
  const parsed = z
    .object({ programId: idField, studentIds: z.array(idField).min(1, 'Select at least one student').max(1000), override: z.boolean().optional(), email: z.boolean().optional() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const d = parsed.data;
  const res = await issueCertificates(user.orgId, user.id, d.programId, d.studentIds, { override: d.override });
  if (!res.ok) return res;

  if (res.issued.length) {
    await auditBy(
      user,
      'certificate.issue',
      `${res.issued.length} certificate${res.issued.length === 1 ? '' : 's'} issued${d.override ? ' (rules overridden)' : ''}`,
      res.issued.map((i) => i.studentId),
      { programId: d.programId, certNos: res.issued.map((i) => i.certNo).slice(0, 200) }
    );
    for (const i of res.issued) {
      await notify({
        orgId: user.orgId,
        userId: i.studentId,
        type: 'certificate.issued',
        title: 'Your certificate is ready 🎓',
        body: 'Congratulations! Open it to view, download or share your certificate.',
        link: `/certificates/${i.id}`,
        dedupeKey: `cert:${i.certNo}`,
      });
    }
    if (d.email) {
      await db();
      const users = (await User.find({ _id: { $in: res.issued.map((i) => i.studentId) }, orgId: user.orgId })
        .select('email')
        .lean()) as { _id: unknown; email: string }[];
      const email = new Map(users.map((u) => [String(u._id), u.email]));
      await sendEmails(
        res.issued
          .filter((i) => email.get(i.studentId))
          .map((i) => ({
            to: email.get(i.studentId) as string,
            subject: `Your certificate from ${settings.orgName}`,
            heading: `Congratulations, ${i.name}!`,
            body: `Your certificate is ready.\n\nCertificate number: ${i.certNo}\n\nOpen the LMS to view, download (as PDF) or share it.`,
            link: `/certificates/${i.id}`,
            ctaLabel: 'View certificate',
          }))
      );
    }
  }
  revalidatePath(`/programs/${d.programId}/certificates`);
  revalidatePath('/certificates');
  return { ok: true, issued: res.issued.length, skipped: res.skipped.map((s) => ({ name: s.name, reason: s.reason })) };
}

export async function revokeCertificateAction(raw: unknown): Promise<R> {
  const user = await requireAuth();
  if (user.role !== 'admin') return { ok: false, error: 'Only admins can revoke certificates' };
  const parsed = z.object({ id: idField, reason: z.string().min(3, 'Give a short reason').max(300) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const res = await revokeCertificate(user.orgId, user.id, parsed.data.id, parsed.data.reason);
  if (!res.ok) return res;
  await auditBy(user, 'certificate.revoke', `${res.certNo} (${res.studentName}): ${parsed.data.reason}`, [res.studentId], { programId: res.programId });
  revalidatePath(`/programs/${res.programId}/certificates`);
  revalidatePath('/certificates');
  revalidatePath(`/certificates/${parsed.data.id}`);
  return { ok: true };
}
