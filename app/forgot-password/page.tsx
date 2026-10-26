// =============================================================================
// FILE: app/forgot-password/page.tsx   (NEW FILE)
// Ask for a password reset link by email.
// =============================================================================

import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import AuthCard from '../reset-password/AuthCard';
import ForgotForm from './ForgotForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default async function ForgotPasswordPage() {
  const s = await getSettings();
  return (
    <AuthCard orgName={s.orgName || 'Nibras'} title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      <ForgotForm emailOn={!!process.env.RESEND_API_KEY} contact={s.contactEmail || ''} />
    </AuthCard>
  );
}
