import { requireAuth } from '@/lib/auth-helpers';
import AppShell from '@/components/AppShell';
import { DEFAULT_SETTINGS } from '@/models/Setting';

let getSettings: () => Promise<any>;

try {
  const settingsModule = await import('@/lib/settings');
  getSettings = settingsModule.getSettings;
} catch (error) {
  console.warn('Settings module not available in app layout:', error);
  getSettings = async () => DEFAULT_SETTINGS;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  
  let s = DEFAULT_SETTINGS;
  try {
    s = await getSettings();
  } catch (error) {
    console.warn('Failed to load settings in app layout:', error);
  }

  return (
    <AppShell
      user={{ name: user.name, role: user.role }}
      orgName={s.orgName || 'Nibras'}
      logo={s.logo || ''}
    >
      {children}
    </AppShell>
  );
}