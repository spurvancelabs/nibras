import { requireAuth } from '@/lib/auth-helpers';
import { getSettings } from '@/lib/settings';
import AppShell from '@/components/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const s = await getSettings();

  return (
    <AppShell
      user={{ name: user.name, role: user.role }}
      orgName={s.orgName}
      logo={s.logo}
    >
      {children}
    </AppShell>
  );
}