'use client';

// =============================================================================
// FILE: app/(app)/admin/courses/[id]/VideoUpload.tsx   (NEW FILE)
// Uploads a lecture video straight from the browser to Cloudinary in 20 MB
// chunks (so long recordings work and nothing passes through our server),
// with progress and cancel. Returns the https URL and the duration.
// The server signs the upload (per-organisation folder) at /api/cloudinary/sign.
// =============================================================================

import { useRef, useState } from 'react';
import { extensionOf } from '@/lib/upload-policy';

const CHUNK = 20 * 1024 * 1024;
const MAX_GB = 2;
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'ogv']);

export type UploadedVideo = { url: string; duration: number; bytes: number };

export default function VideoUpload({ onUploaded, label = 'Upload video' }: { onUploaded: (v: UploadedVideo) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const cancel = useRef<XMLHttpRequest | null>(null);
  const aborted = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError('');
    if (!VIDEO_EXT.has(extensionOf(file.name)) && !file.type.startsWith('video/')) return setError('Choose a video file (MP4, WebM, MOV…).');
    if (file.size > MAX_GB * 1024 ** 3) return setError(`Videos up to ${MAX_GB} GB. For longer recordings, upload to YouTube (unlisted) or Vimeo and paste the link.`);
    aborted.current = false;
    setProgress(0);
    try {
      const signRes = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!signRes.ok) throw new Error(signRes.status === 429 ? 'Too many uploads — wait a few minutes.' : 'Uploads are not set up (Cloudinary).');
      const sign = (await signRes.json()) as { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string };
      const uploadId = `nb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      let result: { secure_url?: string; duration?: number; bytes?: number; error?: { message?: string } } = {};
      for (let start = 0; start < file.size; start += CHUNK) {
        if (aborted.current) throw new Error('Upload cancelled');
        const end = Math.min(start + CHUNK, file.size);
        const fd = new FormData();
        fd.append('file', file.slice(start, end), file.name);
        fd.append('api_key', sign.apiKey);
        fd.append('timestamp', String(sign.timestamp));
        fd.append('signature', sign.signature);
        fd.append('folder', sign.folder);
        result = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          cancel.current = xhr;
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/video/upload`);
          xhr.setRequestHeader('X-Unique-Upload-Id', uploadId);
          xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${file.size}`);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round(((start + e.loaded) / file.size) * 100));
          };
          xhr.onload = () => {
            let json: typeof result = {};
            try {
              json = JSON.parse(xhr.responseText || '{}');
            } catch {}
            if (xhr.status >= 200 && xhr.status < 300) resolve(json);
            else reject(new Error(json.error?.message || `Upload failed (${xhr.status})`));
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.onabort = () => reject(new Error('Upload cancelled'));
          xhr.send(fd);
        });
      }
      if (!result.secure_url) throw new Error('Upload did not finish — please try again.');
      onUploaded({ url: result.secure_url, duration: Math.round(result.duration ?? 0), bytes: result.bytes ?? file.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setProgress(null);
      cancel.current = null;
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {progress === null ? (
        <button type="button" className="btn-outline h-9 px-3 text-sm" onClick={() => input.current?.click()}>
          ⬆ {label}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-hero overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%`, transition: 'width 200ms linear' }} />
          </div>
          <span className="text-xs tabular-nums w-10 text-right">{progress}%</span>
          <button
            type="button"
            className="btn-ghost h-8 px-2 text-xs"
            onClick={() => {
              aborted.current = true;
              cancel.current?.abort();
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
