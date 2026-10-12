'use client';

import { useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  resourceType?: 'image' | 'auto';
  accept?: string;
  className?: string;
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET ?? '';

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

  async function handleFile(file: File) {
    setError('');

    if (!CLOUD_NAME || !PRESET) {
      setError('Cloudinary env vars missing');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
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

  return (
    <div className={`space-y-2 ${className}`}>
      {value && resourceType === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="preview"
          className="h-16 w-auto border rounded-md bg-surface object-contain p-1"
        />
      )}

      <div className="flex items-center gap-2">
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
          className="btn-outline text-sm"
        >
          {uploading ? 'Uploading…' : label}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-muted hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}