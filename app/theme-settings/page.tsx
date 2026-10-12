import ThemeCustomizer from '@/components/ThemeCustomizer';
import ThemeToggle from '@/components/ThemeToggle';
import { getSettings } from '@/lib/settings';

export default async function ThemeSettingsPage() {
  const settings = await getSettings();
  
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Theme Settings</h1>
            <p className="text-sm text-muted">Customize your theme experience</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Current Theme Info */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">Current Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-surface p-3 rounded border">
              <div className="text-muted text-xs">Organization</div>
              <div className="font-medium">{settings.orgName}</div>
            </div>
            <div className="bg-surface p-3 rounded border">
              <div className="text-muted text-xs">Default Mode</div>
              <div className="font-medium capitalize">{settings.themeMode}</div>
            </div>
            <div className="bg-surface p-3 rounded border">
              <div className="text-muted text-xs">Border Radius</div>
              <div className="font-medium">{settings.radiusMd}</div>
            </div>
            <div className="bg-surface p-3 rounded border">
              <div className="text-muted text-xs">Font Family</div>
              <div className="font-medium text-xs">System UI</div>
            </div>
          </div>
        </div>

        {/* Theme Customizer */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Live Theme Customizer</h2>
          <ThemeCustomizer />
        </div>

        {/* Component Preview */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold">Live Component Preview</h2>
          
          {/* Sample Dashboard Layout */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Mock Header */}
            <div className="bg-surface border-b border-border p-4 flex items-center justify-between">
              <div className="font-medium">Sample Dashboard</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Admin User</span>
                <div className="w-6 h-6 bg-primary rounded-full"></div>
              </div>
            </div>
            
            {/* Mock Content */}
            <div className="p-6 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-surface space-y-2">
                  <div className="text-muted text-sm">Total Users</div>
                  <div className="text-2xl font-bold">1,248</div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-success">↗ +12%</span>
                    <span className="text-muted">vs last month</span>
                  </div>
                </div>
                
                <div className="card bg-surface space-y-2">
                  <div className="text-muted text-sm">Active Sessions</div>
                  <div className="text-2xl font-bold">86</div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-warning">↔ 0%</span>
                    <span className="text-muted">vs last month</span>
                  </div>
                </div>
                
                <div className="card bg-surface space-y-2">
                  <div className="text-muted text-sm">Revenue</div>
                  <div className="text-2xl font-bold">$12,846</div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-danger">↘ -3%</span>
                    <span className="text-muted">vs last month</span>
                  </div>
                </div>
              </div>

              {/* Sample Form */}
              <div className="card bg-surface max-w-md space-y-4">
                <h3 className="font-medium">Sample Form</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input" defaultValue="John Doe" />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="input">
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Pending</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary">Save Changes</button>
                    <button className="btn-outline">Cancel</button>
                  </div>
                </div>
              </div>

              {/* Sample Alerts */}
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-primary">
                  <strong>Info:</strong> This is a sample information alert.
                </div>
                <div className="p-3 bg-success/10 border border-success/20 rounded-md text-success">
                  <strong>Success:</strong> Changes have been saved successfully.
                </div>
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-md text-warning">
                  <strong>Warning:</strong> Please review your settings.
                </div>
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-md text-danger">
                  <strong>Error:</strong> Something went wrong. Please try again.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <h3 className="font-semibold text-primary">🎨 Customization Tips</h3>
            <ul className="text-sm text-muted space-y-1">
              <li>• Use the theme toggle to switch between light/dark modes</li>
              <li>• Customize colors with the live editor above</li>
              <li>• Changes apply instantly to all components</li>
              <li>• Colors are automatically contrast-adjusted</li>
              <li>• Reset anytime to restore default themes</li>
            </ul>
          </div>
          
          <div className="card space-y-3">
            <h3 className="font-semibold text-success">✨ Features Available</h3>
            <ul className="text-sm text-muted space-y-1">
              <li>• Live theme preview and editing</li>
              <li>• Persistent user theme preferences</li>
              <li>• System theme detection</li>
              <li>• No-flash dark mode loading</li>
              <li>• Database-driven theme settings</li>
            </ul>
          </div>
        </div>

        {/* Footer Info */}
        <div className="card bg-muted/5 border-muted/20">
          <h3 className="font-semibold text-muted mb-2">About This Theme System</h3>
          <p className="text-sm text-muted">
            This theme system uses CSS custom properties for real-time theme switching, 
            MongoDB for persistent storage, and Next.js App Router for optimal performance. 
            All components are designed to work seamlessly across light and dark themes.
          </p>
        </div>
      </main>
    </div>
  );
}