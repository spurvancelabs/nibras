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

  async function handleFile(file: File) {
    setError('');
    setUploading(true);
    setProgress(0);

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
        className="btn-outline text-sm"
      >
        {uploading ? `Uploading… ${progress}%` : label}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}