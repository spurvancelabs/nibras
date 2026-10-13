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

  return (
    <div className={`space-y-2 ${className}`}>
      {value && resourceType === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="preview"
          className="h-16 w-auto border border-border rounded-md bg-surface object-contain p-1"
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