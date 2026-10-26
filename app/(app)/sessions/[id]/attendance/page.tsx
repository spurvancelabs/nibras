// =============================================================================
// FILE: app/(app)/sessions/[id]/attendance/page.tsx   (UPDATED)
// Attendance is marked on the session page itself — this old address now
// simply forwards there (it used to show a copy of the learner page).
// =============================================================================

import { redirect } from 'next/navigation';

export default async function SessionAttendanceRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/sessions/${encodeURIComponent(id)}`);
}
