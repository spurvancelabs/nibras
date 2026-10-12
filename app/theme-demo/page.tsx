export default function ThemeDemo() {
  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
            Theme System Demo
          </h1>
          <p className="text-muted">
            This page demonstrates the theme system with CSS variables.
          </p>
        </div>

        {/* Color Palette */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div 
                className="w-full h-16 rounded border"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
              <p className="text-sm font-medium">Primary</p>
            </div>
            <div className="space-y-2">
              <div 
                className="w-full h-16 rounded border"
                style={{ backgroundColor: 'var(--color-surface)' }}
              />
              <p className="text-sm font-medium">Surface</p>
            </div>
            <div className="space-y-2">
              <div 
                className="w-full h-16 rounded border"
                style={{ backgroundColor: 'var(--color-success)' }}
              />
              <p className="text-sm font-medium">Success</p>
            </div>
            <div className="space-y-2">
              <div 
                className="w-full h-16 rounded border"
                style={{ backgroundColor: 'var(--color-warning)' }}
              />
              <p className="text-sm font-medium">Warning</p>
            </div>
            <div className="space-y-2">
              <div 
                className="w-full h-16 rounded border"
                style={{ backgroundColor: 'var(--color-danger)' }}
              />
              <p className="text-sm font-medium">Danger</p>
            </div>
          </div>
        </div>

        {/* Components */}
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">Themed Components</h2>
          
          <div className="space-y-4">
            {/* Buttons */}
            <div className="space-y-2">
              <h3 className="font-medium">Buttons</h3>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-primary">Primary Button</button>
                <button className="btn-outline">Outline Button</button>
                <button className="btn-primary" disabled>Disabled</button>
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-2">
              <h3 className="font-medium">Badges</h3>
              <div className="flex gap-2 flex-wrap">
                <span className="badge-muted">Muted</span>
                <span className="badge-success">Success</span>
                <span className="badge-warning">Warning</span>
                <span className="badge-danger">Danger</span>
              </div>
            </div>

            {/* Form Elements */}
            <div className="space-y-2">
              <h3 className="font-medium">Form Elements</h3>
              <div className="max-w-sm space-y-2">
                <label className="label">Input Label</label>
                <input className="input" placeholder="Enter some text..." />
                <p className="text-muted text-sm">Helper text goes here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Toggle Instructions */}
        <div className="card space-y-2">
          <h2 className="text-xl font-semibold">Theme Toggle</h2>
          <p className="text-muted">
            Try logging in and switching between light, dark, and system themes using the toggle in the dashboard header!
          </p>
          <p className="text-sm text-muted">
            Login credentials: admin@lms.dev / admin1234
          </p>
        </div>
      </div>
    </main>
  );
}