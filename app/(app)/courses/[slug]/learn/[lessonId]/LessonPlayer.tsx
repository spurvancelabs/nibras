'use client';

// =============================================================================
// FILE: app/(app)/courses/[slug]/learn/[lessonId]/LessonPlayer.tsx  (NEW FILE)
// Video player + "Mark complete / Next lesson".
//   - YouTube (privacy-enhanced youtube-nocookie) and Vimeo are embedded
//   - uploaded videos use the native <video> player with speed control and
//     resume-where-you-left-off (kept in this browser only)
//   - an uploaded video that is watched to the end is marked complete
// =============================================================================

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/feedback';
import type { VideoSource } from '@/lib/courses-core';
import { completeLessonAction } from '../../../actions';

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function FileVideo({ url, storeKey, onEnded }: { url: string; storeKey: string; onEnded: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let saved = 0;
    try {
      saved = Number(localStorage.getItem(storeKey) || 0);
      const sp = Number(localStorage.getItem('nibras:video-speed') || 1);
      if (SPEEDS.includes(sp)) {
        v.playbackRate = sp;
        setSpeed(sp);
      }
    } catch {}
    const onMeta = () => {
      if (saved > 5 && saved < v.duration - 10) v.currentTime = saved;
    };
    let last = 0;
    const onTime = () => {
      if (Math.abs(v.currentTime - last) < 5) return;
      last = v.currentTime;
      try {
        localStorage.setItem(storeKey, String(Math.floor(v.currentTime)));
      } catch {}
    };
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [storeKey]);
  return (
    <div className="space-y-2">
      <video
        ref={ref}
        src={url}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className="w-full aspect-video bg-black rounded-[var(--radius-lg)]"
        onEnded={() => {
          try {
            localStorage.removeItem(storeKey);
          } catch {}
          onEnded();
        }}
      />
      <div className="flex items-center justify-end gap-1 text-xs">
        <span className="text-muted mr-1">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              if (ref.current) ref.current.playbackRate = s;
              setSpeed(s);
              try {
                localStorage.setItem('nibras:video-speed', String(s));
              } catch {}
            }}
            className={`h-7 px-2 rounded-full border ${speed === s ? 'bg-primary text-primary-fg border-primary' : 'border-border text-muted hover:text-text'}`}
            aria-pressed={speed === s}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

export function VideoFrame({ src, title, storeKey, onEnded }: { src: VideoSource; title: string; storeKey: string; onEnded?: () => void }) {
  if (src.kind === 'youtube')
    return (
      <iframe
        className="w-full aspect-video rounded-[var(--radius-lg)] bg-black"
        src={`https://www.youtube-nocookie.com/embed/${src.id}?rel=0&modestbranding=1`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  if (src.kind === 'vimeo')
    return (
      <iframe
        className="w-full aspect-video rounded-[var(--radius-lg)] bg-black"
        src={`https://player.vimeo.com/video/${src.id}?dnt=1`}
        title={title}
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  if (src.kind === 'file') return <FileVideo url={src.url} storeKey={storeKey} onEnded={onEnded ?? (() => {})} />;
  return null;
}

export default function LessonPlayer({
  courseId,
  slug,
  lessonId,
  title,
  video,
  done,
  enrolled,
  next,
  tokenNote,
}: {
  courseId: string;
  slug: string;
  lessonId: string;
  title: string;
  video: VideoSource;
  done: boolean;
  enrolled: boolean;
  next: { id: string; title: string } | null;
  tokenNote: string;
}) {
  const [isDone, setDone] = useState(done);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => setDone(done), [done, lessonId]);

  const complete = (goNext: boolean) => {
    if (!enrolled) {
      if (goNext && next) router.push(`/courses/${slug}/learn/${next.id}`);
      return;
    }
    start(async () => {
      if (!isDone) {
        const r = await completeLessonAction({ courseId, lessonId }).catch(() => ({ ok: false as const, error: 'Could not save — check your connection.' }));
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        setDone(true);
        if (r.completedCourse) toast.success(`Course complete! 🎉${tokenNote ? ` ${tokenNote}` : ''}`);
        else toast.success(`Lesson done · ${r.percent}%`);
      }
      if (goNext && next) router.push(`/courses/${slug}/learn/${next.id}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {video.kind !== 'none' && <VideoFrame src={video} title={title} storeKey={`nibras:lesson-pos:${courseId}:${lessonId}`} onEnded={() => !isDone && complete(false)} />}
      <div className="flex flex-wrap items-center gap-2">
        {enrolled && (
          <button type="button" className={isDone ? 'btn-outline h-10 px-4 text-sm' : 'btn-primary h-10 px-4 text-sm'} disabled={pending || isDone} onClick={() => complete(false)}>
            {isDone ? '✓ Completed' : pending ? 'Saving…' : 'Mark as complete'}
          </button>
        )}
        {next && (
          <button type="button" className="btn-outline h-10 px-4 text-sm ml-auto" disabled={pending} onClick={() => complete(true)}>
            Next: <span className="truncate max-w-[14rem]">{next.title}</span> →
          </button>
        )}
        {!next && enrolled && (
          <Link href={`/courses/${slug}`} className="btn-outline h-10 px-4 text-sm ml-auto">
            Back to course
          </Link>
        )}
      </div>
    </div>
  );
}
