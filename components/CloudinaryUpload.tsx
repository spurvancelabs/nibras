// =============================================================================
// FILE: components/CloudinaryUpload.tsx
// Single image/file upload to Cloudinary (signed via /api/cloudinary/sign).
// Click or drag & drop. Shows a preview tile, Change and Remove actions.
// =============================================================================

'use client';

import { checkFileBeforeUpload } from '@/lib/upload-policy';
import { useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  resourceType?: 'image' | 'auto';
  accept?: string;
  className?: string;
};

function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? url);
  } catch {
    return url;
  }
}

export default function CloudinaryUpload({
  value,
  onChange,
  label = 'Upload',
  resourceType = 'image',
  accept = 'image/*',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setError('');
    const problem = checkFileBeforeUpload(file);
    if (problem) {
      setError(problem);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setUploading(true);

    try {
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!signRes.ok) {
        throw new Error('Could not get upload signature');
      }
      const sign = (await signRes.json()) as {
        cloudName: string;
        apiKey: string;
        timestamp: number;
        signature: string;
        folder: string;
      };

      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sign.apiKey);
      fd.append('timestamp', String(sign.timestamp));
      fd.append('signature', sign.signature);
      fd.append('folder', sign.folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/${resourceType}/upload`,
        { method: 'POST', body: fd }
      );

      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      const json = (await res.json()) as { secure_url: string };
      onChange(json.secure_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const showImage = !!value && resourceType === 'image';

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !uploading) handleFile(f);
        }}
        className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-dashed transition ${
          dragging ? 'border-primary bg-hero' : 'border-border bg-surface'
        }`}
      >
        {/* Preview tile */}
        <div className="grid place-items-center w-14 h-14 shrink-0 rounded-[var(--radius-md)] border border-border bg-bg overflow-hidden">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="preview" className="max-w-full max-h-full object-contain p-1" />
          ) : uploading ? (
            <span className="w-5 h-5 rounded-full border-2 border-border border-t-primary animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              {value ? (
                <>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </>
              ) : (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5M12 3v12" />
                </>
              )}
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {uploading ? 'Uploading…' : value ? 'Uploaded' : label}
          </p>
          <p className="text-xs text-muted truncate">
            {value ? fileNameFromUrl(value) : 'Click to choose or drop a file here'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-9 px-3 rounded-[var(--radius-md)] border border-border bg-surface text-sm font-medium hover:bg-hero disabled:opacity-50 transition"
          >
            {value ? 'Change' : 'Browse'}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Remove"
              title="Remove"
              className="grid place-items-center h-9 w-9 rounded-[var(--radius-md)] text-muted hover:text-danger hover:bg-danger/10 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}