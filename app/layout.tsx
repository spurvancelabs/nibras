import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';

export const metadata: Metadata = {
  title: 'LMS',
  description: 'Learning Management System',
};

// Placeholder — will be replaced by DB read in Settings module.
const theme = {
  primary: '#2563eb',
  primaryFg: '#ffffff',
  bg: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  muted: '#64748b',
  text: '#0f172a',
  radiusMd: '8px',
  radiusLg: '12px',
  font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Override the @theme tokens at runtime — no flash, no client JS.
  const css = `:root{
    --color-primary:${theme.primary};
    --color-primary-fg:${theme.primaryFg};
    --color-bg:${theme.bg};
    --color-surface:${theme.surface};
    --color-border:${theme.border};
    --color-muted:${theme.muted};
    --color-text:${theme.text};
    --radius-md:${theme.radiusMd};
    --radius-lg:${theme.radiusLg};
    --font-sans:${theme.font};
  }`;

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}