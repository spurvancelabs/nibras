// =============================================================================
// FILE: components/FileUpload.tsx
// Material/file upload to Cloudinary with progress (signed via /api/cloudinary/sign).
// Click or drag & drop; shows a live progress bar while uploading.
// =============================================================================

'use client';

import { useRef, useState } from 'react';

export type UploadedFile = {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  originalName: string;
};

type Props = {
  onUploaded: (file: UploadedFile) => void;
  label?: string;
  accept?: string;
  className?: string;
};

export default function FileUpload({
  onUploaded,
  label = 'Choose file',
  accept = '.pdf,.ppt,.pptx,.doc,.docx,image/*',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  async function handleFile(file: File) {
    setError('');
    setUploading(true);
    setProgress(0);
    setFileName(file.name);

    try {
      // 1. Get a signature from our server
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

      // 2. Upload directly to Cloudinary with the signature
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sign.apiKey);
      fd.append('timestamp', String(sign.timestamp));
      fd.append('signature', sign.signature);
      fd.append('folder', sign.folder);

      const result = await new Promise<UploadedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          'POST',
          `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`
        );
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`Upload failed (${xhr.status})`));
            return;
          }
          try {
            const json = JSON.parse(xhr.responseText) as {
              secure_url: string;
              public_id: string;
              resource_type: string;
              format?: string;
              bytes?: number;
              original_filename?: string;
            };
            resolve({
              url: json.secure_url,
              publicId: json.public_id,
              resourceType: json.resource_type,
              format: json.format ?? '',
              bytes: json.bytes ?? file.size,
              originalName: json.original_filename ?? file.name,
            });
          } catch {
            reject(new Error('Invalid upload response'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(fd);
      });

      onUploaded(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      setFileName('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

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

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
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
        className={`w-full flex items-center gap-3 p-3 text-left rounded-[var(--radius-md)] border border-dashed transition disabled:cursor-progress ${
          dragging ? 'border-primary bg-hero' : 'border-border bg-surface hover:bg-hero/60'
        }`}
      >
        <span className="grid place-items-center w-10 h-10 shrink-0 rounded-[var(--radius-md)] bg-hero text-text">
          {uploading ? (
            <span className="w-4 h-4 rounded-full border-2 border-border border-t-primary animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5M12 3v12" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium truncate">
            {uploading ? `Uploading ${fileName}` : label}
          </span>
          <span className="block text-xs text-muted truncate">
            {uploading ? `${progress}%` : 'Click to choose or drop a file · PDF, slides, docs, images'}
          </span>
        </span>
      </button>

      {uploading && (
        <div
          className="h-1.5 w-full rounded-full bg-hero overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}