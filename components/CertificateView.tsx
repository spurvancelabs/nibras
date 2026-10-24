// =============================================================================
// FILE: components/CertificateView.tsx   (NEW FILE)
// The certificate itself — A4 landscape, three designs (classic, modern,
// elegant). Sizes use container units, so it scales to any screen width and
// prints edge-to-edge (see the print rules in globals.css). Colours are fixed
// per design (not the app theme) so it looks the same for everyone.
// =============================================================================

import type { CertificateView as Cert } from '@/lib/certificates';
import { formatDate, zonedParts } from '@/lib/time';

const STYLES = {
  classic: { bg: '#fdfaf2', ink: '#2b2418', accent: '#9a7b3c', soft: '#efe4c8', font: 'Georgia, "Times New Roman", serif' },
  modern: { bg: '#ffffff', ink: '#0f172a', accent: '#1d4ed8', soft: '#dbeafe', font: '"Plus Jakarta Sans", Inter, system-ui, sans-serif' },
  elegant: { bg: '#f7faf8', ink: '#10261b', accent: '#166534', soft: '#d9eadf', font: 'Georgia, Cambria, serif' },
} as const;

export default function CertificateView({ c, verifyUrl }: { c: Cert; verifyUrl: string }) {
  const s = STYLES[c.style] ?? STYLES.classic;
  const dates =
    c.programStart && c.programEnd
      ? `${formatDate(c.programStart)} – ${formatDate(c.programEnd)}`
      : c.programEnd
      ? `Completed ${formatDate(c.programEnd)}`
      : '';

  return (
    <div className="print-area w-full" style={{ containerType: 'inline-size' }}>
      <div
        className="relative w-full overflow-hidden shadow-xl print:shadow-none"
        style={{ aspectRatio: '297 / 210', background: s.bg, color: s.ink, fontFamily: s.font }}
      >
        {/* ---------- decoration per style ---------- */}
        {c.style === 'classic' && (
          <>
            <div className="absolute" style={{ inset: '2.2cqw', border: `0.35cqw solid ${s.accent}` }} />
            <div className="absolute" style={{ inset: '3cqw', border: `0.12cqw solid ${s.accent}` }} />
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((p) => (
              <span
                key={p}
                aria-hidden
                className="absolute"
                style={{
                  width: '6cqw',
                  height: '6cqw',
                  borderColor: s.accent,
                  borderStyle: 'solid',
                  borderWidth: 0,
                  ...(p.includes('top') ? { top: '3.8cqw', borderTopWidth: '0.5cqw' } : { bottom: '3.8cqw', borderBottomWidth: '0.5cqw' }),
                  ...(p.includes('left') ? { left: '3.8cqw', borderLeftWidth: '0.5cqw' } : { right: '3.8cqw', borderRightWidth: '0.5cqw' }),
                }}
              />
            ))}
          </>
        )}
        {c.style === 'modern' && (
          <>
            <div className="absolute inset-y-0 left-0" style={{ width: '9cqw', background: s.accent }} />
            <div className="absolute inset-y-0" style={{ left: '9cqw', width: '1.2cqw', background: s.soft }} />
            <div aria-hidden className="absolute rounded-full" style={{ right: '-8cqw', top: '-8cqw', width: '28cqw', height: '28cqw', background: s.soft }} />
          </>
        )}
        {c.style === 'elegant' && (
          <>
            <div className="absolute" style={{ inset: '2.4cqw', border: `0.2cqw solid ${s.accent}`, borderRadius: '1.2cqw' }} />
            <div aria-hidden className="absolute left-1/2 -translate-x-1/2" style={{ top: 0, width: '30cqw', height: '1.2cqw', background: s.accent, borderRadius: '0 0 1cqw 1cqw' }} />
            <div aria-hidden className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 0, width: '30cqw', height: '1.2cqw', background: s.accent, borderRadius: '1cqw 1cqw 0 0' }} />
          </>
        )}

        {/* ---------- content ---------- */}
        <div
          className="absolute flex flex-col items-center text-center"
          style={{ inset: c.style === 'modern' ? '6cqw 6cqw 5cqw 16cqw' : '6.5cqw 9cqw 5cqw' }}
        >
          {c.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logo} alt="" style={{ height: '5cqw', objectFit: 'contain' }} />
          ) : (
            <p style={{ fontSize: '1.6cqw', letterSpacing: '0.3em', textTransform: 'uppercase', color: s.accent, fontWeight: 600 }}>{c.issuerName}</p>
          )}

          <p style={{ marginTop: '2.4cqw', fontSize: '4.4cqw', fontWeight: 700, letterSpacing: c.style === 'modern' ? '-0.02em' : '0.02em', lineHeight: 1.1 }}>
            {c.title}
          </p>
          <div aria-hidden style={{ marginTop: '1.2cqw', width: '14cqw', height: '0.25cqw', background: s.accent }} />

          <p style={{ marginTop: '2.6cqw', fontSize: '1.5cqw', opacity: 0.75 }}>This is to certify that</p>
          <p
            style={{
              marginTop: '1cqw',
              fontSize: '4.8cqw',
              fontWeight: c.style === 'modern' ? 700 : 400,
              fontStyle: c.style === 'modern' ? 'normal' : 'italic',
              color: s.ink,
              lineHeight: 1.1,
              borderBottom: `0.15cqw solid ${s.soft}`,
              paddingBottom: '0.6cqw',
              minWidth: '45cqw',
            }}
          >
            {c.studentName}
          </p>
          <p style={{ marginTop: '1.6cqw', fontSize: '1.5cqw', opacity: 0.75 }}>{c.statement}</p>
          <p style={{ marginTop: '0.8cqw', fontSize: '2.6cqw', fontWeight: 700, color: s.accent, lineHeight: 1.2 }}>{c.programName}</p>
          {dates && <p style={{ marginTop: '0.6cqw', fontSize: '1.3cqw', opacity: 0.7 }}>{dates}</p>}

          {c.showScores && (c.attendancePercent !== null || c.assignmentPercent !== null || c.quizPercent !== null) && (
            <p style={{ marginTop: '1cqw', fontSize: '1.15cqw', opacity: 0.75 }}>
              {[
                c.attendancePercent !== null ? `Attendance ${c.attendancePercent}%` : '',
                c.assignmentPercent !== null ? `Assignments ${c.assignmentPercent}%` : '',
                c.quizPercent !== null ? `Quizzes ${c.quizPercent}%` : '',
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </p>
          )}

          {/* signature + seal + date */}
          <div className="mt-auto w-full grid grid-cols-3 items-end" style={{ gap: '3cqw' }}>
            <div className="text-center">
              <p style={{ fontSize: '1.5cqw', fontWeight: 600 }}>{formatDate(c.issuedAt)}</p>
              <div style={{ height: '0.12cqw', background: s.ink, opacity: 0.4, margin: '0.6cqw 0' }} />
              <p style={{ fontSize: '1.1cqw', opacity: 0.7 }}>Date of issue</p>
            </div>
            <div className="flex justify-center">
              <div
                className="grid place-items-center rounded-full"
                style={{
                  width: '10cqw',
                  height: '10cqw',
                  background: s.accent,
                  color: '#fff',
                  boxShadow: `0 0 0 0.5cqw ${s.bg}, 0 0 0 0.75cqw ${s.accent}`,
                  fontSize: '1cqw',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  lineHeight: 1.3,
                  padding: '1cqw',
                }}
              >
                <span>
                  ★<br />
                  Certified
                  <br />
                  {zonedParts(c.issuedAt).year}
                </span>
              </div>
            </div>
            <div className="text-center">
              {c.signatureImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.signatureImage} alt="" style={{ height: '4cqw', margin: '0 auto', objectFit: 'contain' }} />
              ) : (
                <p style={{ fontSize: '2cqw', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>{c.signatoryName}</p>
              )}
              <div style={{ height: '0.12cqw', background: s.ink, opacity: 0.4, margin: '0.6cqw 0' }} />
              <p style={{ fontSize: '1.1cqw', opacity: 0.7 }}>
                {c.signatoryName}
                {c.signatoryTitle ? ` · ${c.signatoryTitle}` : ''}
              </p>
            </div>
          </div>

          <p style={{ marginTop: '1.8cqw', fontSize: '0.95cqw', opacity: 0.6, letterSpacing: '0.04em' }}>
            Certificate no. <b>{c.certNo}</b>
            {c.memberId ? ` · Member ID ${c.memberId}` : ''} · Verify at {verifyUrl}
            {c.footerText ? ` · ${c.footerText}` : ''}
          </p>
        </div>

        {c.status === 'revoked' && (
          <div className="absolute inset-0 grid place-items-center" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <p style={{ fontSize: '8cqw', fontWeight: 800, color: '#b91c1c', transform: 'rotate(-18deg)', border: '0.6cqw solid #b91c1c', padding: '0 3cqw', borderRadius: '1cqw' }}>
              REVOKED
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
