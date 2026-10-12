import { getSettings } from '@/lib/settings';
import ThemeToggle from '@/components/ThemeToggle';
import ThemeCustomizer from '@/components/ThemeCustomizer';

export default async function TestThemePage() {
  const settings = await getSettings();
  
  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">🎨 Complete Theme System</h1>
          <p className="text-muted text-lg">
            Test and customize the complete theme system with live preview
          </p>
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>

        {/* Live Theme Customizer */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">🛠️ Theme Customizer</h2>
          <ThemeCustomizer />
        </div>

        {/* Current Settings Display */}
        <div className="card space-y-4">
          <h2 className="text-2xl font-semibold">📊 Current Database Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Organization:</span> {settings.orgName}
            </div>
            <div>
              <span className="font-medium">Theme Mode:</span> 
              <span className="badge-muted ml-2">{settings.themeMode}</span>
            </div>
            <div>
              <span className="font-medium">Font Family:</span> 
              <span className="font-mono text-xs">{settings.font}</span>
            </div>
            <div>
              <span className="font-medium">Border Radius (MD):</span> {settings.radiusMd}
            </div>
            <div>
              <span className="font-medium">Border Radius (LG):</span> {settings.radiusLg}
            </div>
            <div>
              <span className="font-medium">Contact Email:</span> {settings.contactEmail || 'Not set'}
            </div>
          </div>
        </div>

        {/* Color Palette from Database */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="text-xl font-semibold">☀️ Light Theme (Database)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(settings.light).map(([key, value]) => (
                <div key={key} className="text-center space-y-1">
                  <div
                    className="w-full h-12 rounded border"
                    style={{ backgroundColor: value, borderColor: settings.light.border }}
                  />
                  <p className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-xs text-muted font-mono">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-4">
            <h3 className="text-xl font-semibold">🌙 Dark Theme (Database)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(settings.dark).map(([key, value]) => (
                <div key={key} className="text-center space-y-1">
                  <div
                    className="w-full h-12 rounded border"
                    style={{ backgroundColor: value, borderColor: settings.dark.border }}
                  />
                  <p className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-xs text-muted font-mono">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Component Showcase */}
        <div className="card space-y-6">
          <h2 className="text-2xl font-semibold">🧩 Component Showcase</h2>
          
          {/* Buttons */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Buttons</h3>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary">Primary Button</button>
              <button className="btn-outline">Outline Button</button>
              <button className="btn-primary" disabled>Disabled Button</button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Status Badges</h3>
            <div className="flex flex-wrap gap-2">
              <span className="badge-muted">Muted</span>
              <span className="badge-success">Success</span>
              <span className="badge-warning">Warning</span>
              <span className="badge-danger">Danger</span>
            </div>
          </div>

          {/* Form Elements */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Form Elements</h3>
            <div className="max-w-md space-y-3">
              <div>
                <label className="label">Text Input</label>
                <input className="input" placeholder="Type something here..." defaultValue="Sample text" />
              </div>
              <div>
                <label className="label">Select Dropdown</label>
                <select className="input">
                  <option>Choose an option</option>
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nested Cards */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Card Hierarchy</h3>
            <div className="card bg-surface p-4">
              <h4 className="font-medium mb-3">Level 2 Card</h4>
              <p className="text-muted text-sm mb-3">This card shows surface vs background contrast.</p>
              <div className="card bg-bg p-3">
                <h5 className="font-medium mb-2">Level 3 Card</h5>
                <p className="text-muted text-xs">Nested card showing background color.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live CSS Variables */}
        <div className="card space-y-4">
          <h2 className="text-2xl font-semibold">⚙️ Live CSS Variables</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm font-mono">
            {[
              { var: '--color-primary', desc: 'Primary color' },
              { var: '--color-primary-fg', desc: 'Primary foreground' },
              { var: '--color-bg', desc: 'Background color' },
              { var: '--color-surface', desc: 'Surface color' },
              { var: '--color-border', desc: 'Border color' },
              { var: '--color-muted', desc: 'Muted text' },
              { var: '--color-text', desc: 'Text color' },
              { var: '--color-success', desc: 'Success color' },
              { var: '--color-warning', desc: 'Warning color' },
              { var: '--color-danger', desc: 'Danger color' },
              { var: '--radius-md', desc: 'Medium radius' },
              { var: '--radius-lg', desc: 'Large radius' },
            ].map((item) => (
              <div key={item.var} className="flex justify-between items-center p-3 bg-surface rounded border border-border">
                <div className="flex-1">
                  <div className="text-primary font-medium">{item.var}</div>
                  <div className="text-muted text-xs">{item.desc}</div>
                </div>
                <div 
                  className="text-muted text-xs" 
                  id={item.var.replace('--', '').replace(/-/g, '')}
                >
                  Loading...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="card space-y-4">
          <h2 className="text-2xl font-semibold">📖 How to Use This System</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-success">🎯 For Testing</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Use the theme toggle (☀️💻🌙) to switch between light/dark/system</li>
                <li>Try the live customizer to experiment with colors</li>
                <li>Watch how all components update in real-time</li>
                <li>Check CSS variables to see what's actually applied</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-primary">⚙️ For Development</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>All components use CSS variables for theming</li>
                <li>Settings are stored in MongoDB and cached</li>
                <li>Theme script prevents flash on load</li>
                <li>Fallbacks ensure system works without database</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Admin Access Info */}
        <div className="card space-y-3 bg-primary/5 border-primary/20">
          <h3 className="text-lg font-semibold text-primary">🔐 Admin Features</h3>
          <p className="text-sm">
            For persistent theme changes and full settings management, log in as admin:
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <code className="bg-surface px-2 py-1 rounded text-primary">Email: admin@lms.dev</code>
            <code className="bg-surface px-2 py-1 rounded text-primary">Password: admin1234</code>
          </div>
          <p className="text-xs text-muted">
            After login, visit the dashboard to access the full admin settings panel.
          </p>
        </div>
      </div>

      {/* Client-side script to show CSS variable values */}
      <script dangerouslySetInnerHTML={{
        __html: `
          if (typeof document !== 'undefined') {
            function updateCSSVariables() {
              const root = document.documentElement;
              const computedStyle = getComputedStyle(root);
              const variables = [
                'colorprimary', 'colorprimaryfg', 'colorbg', 'colorsurface',
                'colorborder', 'colormuted', 'colortext', 'colorsuccess',
                'colorwarning', 'colordanger', 'radiusmd', 'radiuslg'
              ];
              
              variables.forEach(variable => {
                const element = document.getElementById(variable);
                if (element) {
                  const cssVar = '--' + variable.replace(/([A-Z])/g, '-$1').toLowerCase().replace('color', 'color-').replace('radius', 'radius-');
                  const value = computedStyle.getPropertyValue(cssVar).trim();
                  element.textContent = value || 'undefined';
                }
              });
            }
            
            // Update initially and on theme changes
            setTimeout(updateCSSVariables, 100);
            
            // Listen for theme changes
            const observer = new MutationObserver(updateCSSVariables);
            observer.observe(document.documentElement, { 
              attributes: true, 
              attributeFilter: ['class', 'style'] 
            });
          }
        `
      }} />
    </main>
  );
}