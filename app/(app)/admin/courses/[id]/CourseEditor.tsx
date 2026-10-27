'use client';

// =============================================================================
// FILE: app/(app)/admin/courses/[id]/CourseEditor.tsx   (NEW FILE)
// Course builder:
//   Details    — title, subtitle, description, cover, level, category
//   Access     — free / Premium / tokens (+ price), audience programs,
//                instructors
//   Curriculum — sections and lessons (add, rename, reorder, delete). Each
//                lesson: video (upload or YouTube/Vimeo link), explanation,
//                downloadable resources, free-preview switch
//   Learners   — who is enrolled and how far they are
// Unsaved changes are kept until you save (and the browser warns on leave).
// =============================================================================

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal, useConfirm, useToast } from '@/components/feedback';
import CloudinaryUpload from '@/components/CloudinaryUpload';
import FileUpload from '@/components/FileUpload';
import { formatDuration, parseVideo, slugify } from '@/lib/courses-core';
import type { CourseInput, LessonInput, SectionInput, LearnerRow } from '@/lib/courses';
import { saveCourseAction, deleteCourseAction } from '../actions';
import VideoUpload from './VideoUpload';
import { RichText } from '@/app/(app)/courses/CourseBits';

type Option = { id: string; name: string };
const rid = () => Math.random().toString(36).slice(2, 10);
const blankLesson = (): LessonInput => ({ id: rid(), title: '', type: 'video', videoUrl: '', duration: 0, body: '', resources: [], preview: false });

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

const fieldCls = 'input h-10 w-full';
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Pick({ options, value, onChange, empty }: { options: Option[]; value: string[]; onChange: (v: string[]) => void; empty: string }) {
  if (!options.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
            className={`h-8 px-3 rounded-full border text-xs font-medium transition-colors ${on ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text hover:bg-hero'}`}
          >
            {on ? '✓ ' : ''}
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson dialog
// ---------------------------------------------------------------------------

function LessonDialog({ lesson, onClose, onSave }: { lesson: LessonInput | null; onClose: () => void; onSave: (l: LessonInput) => void }) {
  const [l, setL] = useState<LessonInput>(lesson ?? blankLesson());
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (lesson) setL(lesson);
    setPreview(false);
  }, [lesson]);
  const video = parseVideo(l.videoUrl);
  const badLink = l.type === 'video' && !!l.videoUrl && video.kind === 'none';
  const mins = Math.floor(l.duration / 60);
  const secs = l.duration % 60;
  const set = <K extends keyof LessonInput>(k: K, v: LessonInput[K]) => setL((x) => ({ ...x, [k]: v }));

  return (
    <Modal
      open={!!lesson}
      onClose={onClose}
      size="lg"
      title={lesson?.title ? 'Edit lesson' : 'New lesson'}
      footer={
        <>
          <button type="button" className="btn-ghost h-10 px-4" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary h-10 px-5"
            disabled={!l.title.trim() || badLink}
            onClick={() => onSave({ ...l, title: l.title.trim() })}
          >
            Done
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Lesson title">
          <input className={fieldCls} value={l.title} maxLength={200} autoFocus onChange={(e) => set('title', e.target.value)} placeholder="e.g. Variables and types" />
        </Field>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Lesson type">
          {(['video', 'article'] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={l.type === t} onClick={() => set('type', t)} className={`h-9 px-4 rounded-full border text-sm ${l.type === t ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:bg-hero'}`}>
              {t === 'video' ? '▶ Video lecture' : '≡ Reading'}
            </button>
          ))}
        </div>

        {l.type === 'video' && (
          <div className="space-y-3 p-4 rounded-[var(--radius-md)] border border-border bg-hero/40">
            <Field label="Video" hint="Upload a recording, or paste a YouTube / Vimeo link (unlisted videos work).">
              <input className={fieldCls} value={l.videoUrl} maxLength={1000} placeholder="https://youtu.be/…  or  https://vimeo.com/…" onChange={(e) => set('videoUrl', e.target.value.trim())} />
            </Field>
            {badLink && <p className="text-xs text-danger">That link isn’t a YouTube, Vimeo or uploaded video (https) link.</p>}
            <div className="flex flex-wrap items-center gap-3">
              <VideoUpload label={l.videoUrl ? 'Replace with upload' : 'Upload video'} onUploaded={(v) => setL((x) => ({ ...x, videoUrl: v.url, duration: v.duration || x.duration }))} />
              {video.kind !== 'none' && <span className="text-xs text-success">✓ {video.kind === 'file' ? 'Uploaded video' : video.kind === 'youtube' ? 'YouTube' : 'Vimeo'}</span>}
            </div>
            <div className="flex items-end gap-2">
              <Field label="Length">
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={1440} className="input h-10 w-20" value={mins} onChange={(e) => set('duration', Math.max(0, Number(e.target.value) || 0) * 60 + secs)} aria-label="Minutes" />
                  <span className="text-sm text-muted">min</span>
                  <input type="number" min={0} max={59} className="input h-10 w-20" value={secs} onChange={(e) => set('duration', mins * 60 + Math.min(59, Math.max(0, Number(e.target.value) || 0)))} aria-label="Seconds" />
                  <span className="text-sm text-muted">sec</span>
                </div>
              </Field>
            </div>
          </div>
        )}

        <Field label={l.type === 'video' ? 'Explanation (optional)' : 'Lesson text'} hint="Blank line = new paragraph · ## Heading · - list · 1. numbered · **bold** · `code` · ``` code block ```">
          <textarea className="input w-full min-h-40 py-2 font-mono text-[13px]" value={l.body} maxLength={20000} onChange={(e) => set('body', e.target.value)} />
        </Field>
        {l.body.trim() && (
          <div>
            <button type="button" className="text-xs text-primary underline" onClick={() => setPreview((p) => !p)}>
              {preview ? 'Hide preview' : 'Show preview'}
            </button>
            {preview && (
              <div className="mt-2 p-4 rounded-[var(--radius-md)] border border-border">
                <RichText text={l.body} />
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Resources</p>
          {l.resources.length > 0 && (
            <ul className="divide-y divide-border border border-border rounded-[var(--radius-md)]">
              {l.resources.map((r, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2">
                  <input className="input h-8 flex-1 text-sm" value={r.title} maxLength={200} aria-label="Resource name" onChange={(e) => set('resources', l.resources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-text">
                    Open
                  </a>
                  <button type="button" className="btn-ghost h-8 px-2 text-xs text-danger" onClick={() => set('resources', l.resources.filter((_, j) => j !== i))} aria-label={`Remove ${r.title}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {l.resources.length < 20 && (
            <div className="flex flex-wrap gap-2 items-start">
              <FileUpload
                label="Attach a file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv,.ipynb,.py,.js,image/*"
                onUploaded={(f) => set('resources', [...l.resources, { title: f.originalName || 'File', url: f.url, format: f.format, size: f.bytes }])}
              />
              <button
                type="button"
                className="btn-ghost h-9 px-3 text-sm"
                onClick={() => {
                  const url = window.prompt('Paste a link (https://…)');
                  if (url && /^https?:\/\/\S+$/i.test(url.trim())) set('resources', [...l.resources, { title: url.trim().replace(/^https?:\/\//, '').slice(0, 60), url: url.trim(), format: 'link', size: 0 }]);
                }}
              >
                + Add a link
              </button>
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-border cursor-pointer">
          <input type="checkbox" className="mt-1" checked={l.preview} onChange={(e) => set('preview', e.target.checked)} />
          <span>
            <span className="block text-sm font-medium">Free preview</span>
            <span className="block text-xs text-muted">Anyone who can see the course can watch this lesson before enrolling.</span>
          </span>
        </label>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export default function CourseEditor({
  initial,
  id,
  programs,
  staff,
  learners,
  premiumOn,
  tokensOn,
  tokenName,
  tokenIcon,
  premiumName,
  canChooseInstructors,
}: {
  initial: CourseInput;
  id: string | null;
  programs: Option[];
  staff: Option[];
  learners: LearnerRow[];
  premiumOn: boolean;
  tokensOn: boolean;
  tokenName: string;
  tokenIcon: string;
  premiumName: string;
  canChooseInstructors: boolean;
}) {
  const [c, setC] = useState<CourseInput>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [tab, setTab] = useState<'details' | 'curriculum' | 'learners'>(id ? 'curriculum' : 'details');
  const [editing, setEditing] = useState<{ s: number; l: number | null; lesson: LessonInput } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const dirty = JSON.stringify(c) !== saved;
  const set = <K extends keyof CourseInput>(k: K, v: CourseInput[K]) => setC((x) => ({ ...x, [k]: v }));
  const setSections = (fn: (s: SectionInput[]) => SectionInput[]) => setC((x) => ({ ...x, sections: fn(x.sections) }));
  const stats = useMemo(() => {
    const lessons = c.sections.flatMap((s) => s.lessons);
    return { lessons: lessons.length, duration: lessons.reduce((a, l) => a + (l.duration || 0), 0) };
  }, [c.sections]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = (status?: CourseInput['status']) => {
    const next = { ...c, ...(status ? { status } : {}) };
    start(async () => {
      const r = await saveCourseAction({ ...next, id: id ?? undefined }).catch(() => ({ ok: false as const, error: 'Could not save — your changes are still here. Try again.' }));
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setC({ ...next, slug: r.slug });
      setSaved(JSON.stringify({ ...next, slug: r.slug }));
      toast.success(status === 'published' && c.status !== 'published' ? 'Published 🎉' : 'Saved');
      if (!id) router.replace(`/admin/courses/${r.id}`);
      else router.refresh();
    });
  };

  const TabBtn = ({ t, label }: { t: typeof tab; label: string }) => (
    <button type="button" onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined} className={`h-10 px-4 -mb-px text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-text' : 'border-transparent text-muted hover:text-text'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <nav className="flex gap-1.5 border-b border-border overflow-x-auto" aria-label="Course editor sections">
        <TabBtn t="details" label="Details & access" />
        <TabBtn t="curriculum" label={`Curriculum (${stats.lessons})`} />
        {id && <TabBtn t="learners" label={`Learners (${learners.length})`} />}
      </nav>

      {tab === 'details' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="space-y-4 p-5 bg-surface border border-border rounded-[var(--radius-lg)]">
            <Field label="Title">
              <input className={fieldCls} value={c.title} maxLength={200} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Python from zero" />
            </Field>
            <Field label="Short summary" hint="One line shown on the course card.">
              <input className={fieldCls} value={c.subtitle} maxLength={300} onChange={(e) => set('subtitle', e.target.value)} />
            </Field>
            <Field label="Description" hint="What learners will be able to do. Same formatting as lesson explanations.">
              <textarea className="input w-full min-h-36 py-2" value={c.description} maxLength={10000} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Level">
                <select className={fieldCls} value={c.level} onChange={(e) => set('level', e.target.value as CourseInput['level'])}>
                  <option value="all">All levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </Field>
              <Field label="Category">
                <input className={fieldCls} value={c.category} maxLength={60} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Programming" />
              </Field>
              <Field label="Web address" hint={`/courses/${slugify(c.slug || c.title)}`}>
                <input className={fieldCls} value={c.slug} maxLength={90} onChange={(e) => set('slug', e.target.value)} placeholder="auto from title" />
              </Field>
            </div>
          </section>

          <div className="space-y-5">
            <section className="space-y-3 p-5 bg-surface border border-border rounded-[var(--radius-lg)]">
              <p className="text-sm font-medium">Cover image</p>
              <CloudinaryUpload value={c.cover} onChange={(u) => set('cover', u)} label="Upload cover (16:9)" />
            </section>
            <section className="space-y-3 p-5 bg-surface border border-border rounded-[var(--radius-lg)]">
              <p className="text-sm font-medium">Who can enrol</p>
              <div className="space-y-2" role="radiogroup" aria-label="Access">
                {[
                  { v: 'free' as const, t: 'Free', d: 'Anyone in the audience.' },
                  { v: 'premium' as const, t: `👑 ${premiumName}`, d: premiumOn ? `${premiumName} members only.` : `${premiumName} is off — this course is free until it’s on.` },
                  { v: 'tokens' as const, t: `${tokenIcon} Pay with ${tokenName}`, d: tokensOn ? `One-time price. ${premiumName} members enrol free.` : `${tokenName} are off — this course is free until they’re on.` },
                ].map((o) => (
                  <label key={o.v} className={`flex items-start gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer ${c.access === o.v ? 'border-primary bg-hero/50' : 'border-border'}`}>
                    <input type="radio" name="access" className="mt-1" checked={c.access === o.v} onChange={() => set('access', o.v)} />
                    <span>
                      <span className="block text-sm font-medium">{o.t}</span>
                      <span className="block text-xs text-muted">{o.d}</span>
                    </span>
                  </label>
                ))}
              </div>
              {c.access === 'tokens' && (
                <Field label={`Price in ${tokenName}`}>
                  <input type="number" min={1} max={1000000} className={fieldCls} value={c.tokenPrice || ''} onChange={(e) => set('tokenPrice', Math.max(0, Math.round(Number(e.target.value) || 0)))} />
                </Field>
              )}
            </section>
            <section className="space-y-3 p-5 bg-surface border border-border rounded-[var(--radius-lg)]">
              <p className="text-sm font-medium">Audience</p>
              <p className="text-xs text-muted">{c.programIds.length ? 'Only learners in the chosen programs can see it.' : 'Everyone in the organisation can see it. Pick programs to limit it.'}</p>
              <Pick options={programs} value={c.programIds} onChange={(v) => set('programIds', v)} empty="No programs yet." />
            </section>
            {canChooseInstructors && (
              <section className="space-y-3 p-5 bg-surface border border-border rounded-[var(--radius-lg)]">
                <p className="text-sm font-medium">Instructors</p>
                <p className="text-xs text-muted">Shown on the course page. Instructors who are mentors can also edit it.</p>
                <Pick options={staff} value={c.instructorIds} onChange={(v) => set('instructorIds', v)} empty="No mentors yet." />
              </section>
            )}
          </div>
        </div>
      )}

      {tab === 'curriculum' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {stats.lessons} lessons{stats.duration ? ` · ${formatDuration(stats.duration)}` : ''}. Use the arrows to reorder.
          </p>
          {c.sections.map((s, si) => (
            <section key={s.id} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-hero/40">
                <span className="text-sm text-muted tabular-nums w-6">{si + 1}.</span>
                <input className="input h-9 flex-1 font-medium" value={s.title} maxLength={200} aria-label="Section title" onChange={(e) => setSections((all) => all.map((x, j) => (j === si ? { ...x, title: e.target.value } : x)))} />
                <button type="button" className="btn-ghost h-8 w-8 p-0" aria-label="Move section up" disabled={si === 0} onClick={() => setSections((all) => move(all, si, -1))}>
                  ↑
                </button>
                <button type="button" className="btn-ghost h-8 w-8 p-0" aria-label="Move section down" disabled={si === c.sections.length - 1} onClick={() => setSections((all) => move(all, si, 1))}>
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-ghost h-8 px-2 text-xs text-danger"
                  onClick={async () => {
                    if (s.lessons.length && !(await confirm({ title: `Remove “${s.title}”?`, body: `Its ${s.lessons.length} lesson(s) are removed too (after you save).`, tone: 'danger', confirmLabel: 'Remove' }))) return;
                    setSections((all) => all.filter((_, j) => j !== si));
                  }}
                >
                  Remove
                </button>
              </div>
              <ul className="divide-y divide-border">
                {s.lessons.map((l, li) => {
                  const v = parseVideo(l.videoUrl);
                  return (
                    <li key={l.id} className="flex items-center gap-2 px-4 py-2.5">
                      <span className="grid place-items-center w-6 h-6 rounded-full bg-hero text-[11px] text-muted shrink-0" aria-hidden>
                        {l.type === 'video' ? '▶' : '≡'}
                      </span>
                      <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setEditing({ s: si, l: li, lesson: l })}>
                        <span className="block text-sm font-medium truncate hover:underline">{l.title}</span>
                        <span className="block text-xs text-muted">
                          {[
                            l.type === 'video' ? (v.kind === 'none' ? '⚠ no video yet' : v.kind === 'file' ? 'uploaded video' : v.kind) : 'reading',
                            l.duration ? formatDuration(l.duration) : '',
                            l.resources.length ? `${l.resources.length} resource(s)` : '',
                            l.preview ? 'free preview' : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                      <button type="button" className="btn-ghost h-8 w-8 p-0" aria-label="Move lesson up" disabled={li === 0} onClick={() => setSections((all) => all.map((x, j) => (j === si ? { ...x, lessons: move(x.lessons, li, -1) } : x)))}>
                        ↑
                      </button>
                      <button type="button" className="btn-ghost h-8 w-8 p-0" aria-label="Move lesson down" disabled={li === s.lessons.length - 1} onClick={() => setSections((all) => all.map((x, j) => (j === si ? { ...x, lessons: move(x.lessons, li, 1) } : x)))}>
                        ↓
                      </button>
                      {c.sections.length > 1 && (
                        <select
                          className="input h-8 w-auto text-xs hidden sm:block"
                          aria-label="Move to section"
                          value=""
                          onChange={(e) => {
                            const to = Number(e.target.value);
                            setSections((all) => all.map((x, j) => (j === si ? { ...x, lessons: x.lessons.filter((_, k) => k !== li) } : j === to ? { ...x, lessons: [...x.lessons, l] } : x)));
                          }}
                        >
                          <option value="">Move…</option>
                          {c.sections.map((x, j) => (j === si ? null : <option key={x.id} value={j}>{`→ ${j + 1}. ${x.title.slice(0, 30)}`}</option>))}
                        </select>
                      )}
                      <button type="button" className="btn-ghost h-8 px-2 text-xs text-danger" aria-label={`Delete ${l.title}`} onClick={() => setSections((all) => all.map((x, j) => (j === si ? { ...x, lessons: x.lessons.filter((_, k) => k !== li) } : x)))}>
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-4 py-2.5">
                <button type="button" className="btn-ghost h-9 px-3 text-sm" onClick={() => setEditing({ s: si, l: null, lesson: blankLesson() })}>
                  + Add lesson
                </button>
              </div>
            </section>
          ))}
          <button type="button" className="btn-outline h-10 px-4 text-sm" onClick={() => setSections((all) => [...all, { id: rid(), title: `Section ${all.length + 1}`, lessons: [] }])}>
            + Add section
          </button>
        </div>
      )}

      {tab === 'learners' && (
        <section className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
          {learners.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 font-medium">Learner</th>
                    <th className="px-4 py-2.5 font-medium">Joined via</th>
                    <th className="px-4 py-2.5 font-medium">Progress</th>
                    <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {learners.map((r) => (
                    <tr key={r.userId}>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium">{r.name}</span>
                        <span className="block text-xs text-muted">{r.email}</span>
                      </td>
                      <td className="px-4 py-2.5 capitalize">{r.via}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-hero overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${r.percent}%` }} />
                          </div>
                          <span className="tabular-nums text-xs">{r.completedAt ? '✓ done' : `${r.percent}%`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted hidden sm:table-cell">{r.lastSeenAt ? new Date(r.lastSeenAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-sm text-muted">No one has enrolled yet.</p>
          )}
        </section>
      )}

      {/* sticky save bar */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-3 z-20 rounded-[var(--radius-lg)] border border-border bg-surface/95 backdrop-blur shadow-lg">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-sm text-muted mr-auto">
            Status: <strong className="capitalize text-text">{c.status}</strong>
            {dirty && <span className="ml-2 text-warning">· unsaved changes</span>}
          </span>
          {id && c.status !== 'draft' && (
            <Link href={`/courses/${c.slug}`} className="btn-ghost h-10 px-3 text-sm">
              View
            </Link>
          )}
          {id && (
            <button
              type="button"
              className="btn-ghost h-10 px-3 text-sm text-danger"
              disabled={pending}
              onClick={async () => {
                if (!(await confirm({ title: 'Delete this course?', body: 'If anyone is enrolled it is archived instead, so they keep access.', tone: 'danger', confirmLabel: 'Delete' }))) return;
                start(async () => {
                  const r = await deleteCourseAction({ id });
                  if (!r.ok) toast.error(r.error);
                  else {
                    setSaved(JSON.stringify(c));
                    toast.success(r.archived ? 'Archived (people are enrolled)' : 'Deleted');
                    router.push('/admin/courses');
                  }
                });
              }}
            >
              Delete
            </button>
          )}
          {c.status === 'published' ? (
            <>
              <button type="button" className="btn-outline h-10 px-4 text-sm" disabled={pending} onClick={() => save('draft')}>
                Unpublish
              </button>
              <button type="button" className="btn-primary h-10 px-5 text-sm" disabled={pending || !dirty} onClick={() => save()}>
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-outline h-10 px-4 text-sm" disabled={pending} onClick={() => save(c.status === 'archived' ? 'archived' : 'draft')}>
                {pending ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" className="btn-primary h-10 px-5 text-sm" disabled={pending || !stats.lessons} onClick={() => save('published')} title={stats.lessons ? '' : 'Add a lesson first'}>
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      <LessonDialog
        lesson={editing?.lesson ?? null}
        onClose={() => setEditing(null)}
        onSave={(l) => {
          if (!editing) return;
          setSections((all) => all.map((x, j) => (j === editing.s ? { ...x, lessons: editing.l === null ? [...x.lessons, l] : x.lessons.map((y, k) => (k === editing.l ? l : y)) } : x)));
          setEditing(null);
        }}
      />
    </div>
  );
}
