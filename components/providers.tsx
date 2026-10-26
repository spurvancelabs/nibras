'use client';

// =============================================================================
// FILE: components/providers.tsx   (UPDATED)
// Session + app-wide feedback (toasts, confirm dialogs, identity confirmation).
// =============================================================================

import { SessionProvider } from 'next-auth/react';
import { FeedbackProvider } from './feedback';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FeedbackProvider>{children}</FeedbackProvider>
    </SessionProvider>
  );
}
