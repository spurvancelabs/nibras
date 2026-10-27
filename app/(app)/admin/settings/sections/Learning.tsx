// =============================================================================
// FILE: app/(app)/admin/settings/sections/Learning.tsx   (NEW FILE)
// Settings → Features and Announcement (with a live banner preview).
// =============================================================================

'use client';

import { SettingsCard, Field, Toggle, Segmented, RadioCards } from '@/components/settings-ui';
import NavIcon from '@/components/NavIcon';
import type { ThemeSettings } from '@/lib/theme-config';
import type { SectionProps } from './types';

const FEATURES = [
  ['featureQuizzes', 'Quizzes', 'Timed quizzes for programs and sessions with auto-grading.', '❓'],
  ['featureCertificates', 'Certificates', 'Issue certificates when students complete a program, with public verification.', '🎓'],
  ['featureSyllabus', 'Syllabus', 'A week-by-week syllabus on every program page.', '🗺️'],
  ['featureGradebook', 'Gradebook', 'Marks for every student across assignments and quizzes, with CSV export.', '📊'],
  ['featureQueries', 'Queries', 'Students can ask mentors questions and get replies.', '💬'],
  ['featureCourses', 'Video courses', 'Pre-recorded courses with lessons, explanations and resources that learners enrol in.', '🎬'],
] as const;

export function FeaturesSection({ form, set }: SectionProps) {
  const on = FEATURES.filter(([k]) => form[k]).length;
  return (
    <SettingsCard
      title="Features"
      description="Turning a feature off hides it from menus and pages. No data is deleted — switch it back on any time."
      icon={<NavIcon name="dash" />}
      actions={<span className="text-xs text-muted self-center">{on} of {FEATURES.length} on</span>}
    >
      <div className="grid md:grid-cols-2 gap-3">
        {FEATURES.map(([key, label, hint, icon]) => (
          <Toggle key={key} checked={form[key]} onChange={(v) => set(key, v)} label={label} description={hint} icon={icon} />
        ))}
      </div>
    </SettingsCard>
  );
}

const TONE_PREVIEW: Record<ThemeSettings['announcementTone'], string> = {
  info: 'bg-hero text-text border-border',
  success: 'bg-success/12 text-success border-success/30',
  warning: 'bg-warning/15 text-text border-warning/40',
  danger: 'bg-danger/12 text-danger border-danger/30',
};

export function AnnouncementSection({ form, set }: SectionProps) {
  const linkBad =
    form.announcementLink !== '' && !/^https?:\/\/\S+$/i.test(form.announcementLink) && !/^\/[^\s/][^\s]*$/.test(form.announcementLink);
  return (
    <>
      <SettingsCard title="Announcement banner" description="A short message at the top of every page — a schedule change, a holiday, an exam reminder." icon={<NavIcon name="bell" />}>
        <Toggle checked={form.announcementEnabled} onChange={(v) => set('announcementEnabled', v)} label="Show the banner" description="People can dismiss it for the rest of their visit." icon="📣" />
        <Field label="Message" htmlFor="annText" aside={`${form.announcementText.length}/280`}>
          <textarea id="annText" className="input min-h-[84px]" maxLength={280} value={form.announcementText} onChange={(e) => set('announcementText', e.target.value)} placeholder="Lecture 3 moves to Sunday 8 pm this week." />
        </Field>
        <Field label="Style">
          <Segmented<ThemeSettings['announcementTone']>
            value={form.announcementTone}
            onChange={(v) => set('announcementTone', v)}
            options={[
              { value: 'info', label: 'Info' },
              { value: 'success', label: 'Good news' },
              { value: 'warning', label: 'Warning' },
              { value: 'danger', label: 'Urgent' },
            ]}
          />
        </Field>
        <Field label="Who sees it">
          <RadioCards<ThemeSettings['announcementAudience']>
            value={form.announcementAudience}
            onChange={(v) => set('announcementAudience', v)}
            columns={4}
            options={[
              { value: 'all', title: 'Everyone', icon: '🌍' },
              { value: 'student', title: 'Students', icon: '🎒' },
              { value: 'mentor', title: 'Mentors', icon: '🧑‍🏫' },
              { value: 'admin', title: 'Admins', icon: '🛡️' },
            ]}
          />
        </Field>
        <Field label="Link (optional)" htmlFor="annLink" hint="A page like /quizzes or a full https:// link." error={linkBad ? 'Use a page path like /quizzes or a full URL.' : null}>
          <input id="annLink" className="input h-11" value={form.announcementLink} onChange={(e) => set('announcementLink', e.target.value)} placeholder="/quizzes or https://…" />
        </Field>
      </SettingsCard>

      <SettingsCard title="Preview">
        {form.announcementText.trim() ? (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-sm ${TONE_PREVIEW[form.announcementTone]} ${form.announcementEnabled ? '' : 'opacity-50'}`}>
            <span aria-hidden>📣</span>
            <p className="flex-1 min-w-0 whitespace-pre-line">
              {form.announcementText}
              {form.announcementLink && <span className="font-semibold underline underline-offset-2"> Open</span>}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Write a message to see the preview.</p>
        )}
        {!form.announcementEnabled && form.announcementText.trim() && <p className="text-xs text-muted">The banner is switched off.</p>}
      </SettingsCard>
    </>
  );
}
