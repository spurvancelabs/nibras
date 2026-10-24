// =============================================================================
// FILE: app/(app)/certificates/[id]/CertificateActions.tsx   (NEW FILE)
// Print / save as PDF (browser print dialog, A4 landscape) + copy verify link.
// =============================================================================

'use client';

import { useState } from 'react';

export default function CertificateActions({ verifyLink, canShare }: { verifyLink: string; canShare: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button type="button" className="btn-primary h-10 px-4" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      {canShare && (
        <>
          <button
            type="button"
            className="btn-outline h-10 px-4"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(verifyLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                window.prompt('Copy this link', verifyLink);
              }
            }}
          >
            {copied ? 'Copied ✓' : 'Copy verification link'}
          </button>
          <a
            className="btn-outline h-10 px-4 inline-flex items-center"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyLink)}`}
          >
            Share on LinkedIn
          </a>
        </>
      )}
    </div>
  );
}
