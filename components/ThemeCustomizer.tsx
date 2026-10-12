'use client';

import { useState } from 'react';
import type { ThemePalette, ThemeMode } from '@/models/Setting';

const DEFAULT_LIGHT: ThemePalette = {
  primary: '#2563eb',
  primaryFg: '#ffffff',
  bg: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  muted: '#64748b',
  text: '#0f172a',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
};

const DEFAULT_DARK: ThemePalette = {
  primary: '#60a5fa',
  primaryFg: '#0f172a',
  bg: '#0b1220',
  surface: '#111827',
  border: '#1f2937',
  muted: '#94a3b8',
  text: '#e5e7eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function ThemeCustomizer() {
  const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');
  const [lightPalette, setLightPalette] = useState<ThemePalette>(DEFAULT_LIGHT);
  const [darkPalette, setDarkPalette] = useState<ThemePalette>(DEFAULT_DARK);
  const [previewMode, setPreviewMode] = useState<ThemeMode>('light');

  const currentPalette = activeTab === 'light' ? lightPalette : darkPalette;
  const setCurrentPalette = activeTab === 'light' ? setLightPalette : setDarkPalette;

  function updateColor(key: keyof ThemePalette, value: string) {
    setCurrentPalette(prev => ({ ...prev, [key]: value }));
  }

  function applyTheme() {
    const palette = previewMode === 'dark' ? darkPalette : lightPalette;
    const root = document.documentElement;
    
    // Apply CSS variables
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Update dark class
    if (previewMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  function resetToDefaults() {
    setLightPalette(DEFAULT_LIGHT);
    setDarkPalette(DEFAULT_DARK);
    // Reset CSS variables
    const root = document.documentElement;
    root.removeAttribute('style');
    root.classList.remove('dark');
  }

  const colorFields: { key: keyof ThemePalette; label: string; description: string }[] = [
    { key: 'primary', label: 'Primary', description: 'Main brand color for buttons, links' },
    { key: 'primaryFg', label: 'Primary Text', description: 'Text color on primary background' },
    { key: 'bg', label: 'Background', description: 'Main page background' },
    { key: 'surface', label: 'Surface', description: 'Card and panel backgrounds' },
    { key: 'border', label: 'Border', description: 'Border lines and dividers' },
    { key: 'muted', label: 'Muted Text', description: 'Secondary text color' },
    { key: 'text', label: 'Text', description: 'Primary text color' },
    { key: 'success', label: 'Success', description: 'Success states and notifications' },
    { key: 'warning', label: 'Warning', description: 'Warning states and alerts' },
    { key: 'danger', label: 'Danger', description: 'Error states and destructive actions' },
  ];

  return (
    <div className="space-y-6">
      {/* Preview Mode Toggle */}
      <div className="card space-y-3">
        <h3 className="font-semibold">Preview Mode</h3>
        <div className="flex gap-2">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={mode === previewMode ? 'btn-primary' : 'btn-outline'}
            >
              {mode === 'light' ? '☀️' : '🌙'} {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Editing Tabs */}
      <div className="card space-y-4">
        <div className="flex gap-2 border-b border-border pb-2">
          {(['light', 'dark'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-primary text-text'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {tab === 'light' ? '☀️' : '🌙'} {tab.charAt(0).toUpperCase() + tab.slice(1)} Palette
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted">
            Editing {activeTab} theme colors. Preview in {previewMode} mode.
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="label">{field.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentPalette[field.key]}
                    onChange={(e) => updateColor(field.key, e.target.value)}
                    className="h-9 w-12 border border-border rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentPalette[field.key]}
                    onChange={(e) => updateColor(field.key, e.target.value)}
                    className="input flex-1"
                  />
                </div>
                <p className="text-xs text-muted">{field.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-between">
        <button onClick={resetToDefaults} className="btn-outline">
          Reset to Defaults
        </button>
        <div className="flex gap-2">
          <button onClick={applyTheme} className="btn-primary">
            Apply Preview
          </button>
        </div>
      </div>

      {/* Color Preview */}
      <div className="card space-y-4">
        <h3 className="font-semibold">Current Colors</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {colorFields.map((field) => (
            <div key={field.key} className="text-center space-y-2">
              <div
                className="w-full h-16 rounded border-2"
                style={{ 
                  backgroundColor: currentPalette[field.key],
                  borderColor: currentPalette.border
                }}
              />
              <div>
                <p className="font-medium text-sm">{field.label}</p>
                <p className="text-xs text-muted font-mono">{currentPalette[field.key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="card space-y-2">
        <h3 className="font-semibold">How to Use</h3>
        <div className="text-sm text-muted space-y-1">
          <p>1. Choose which palette to edit (Light or Dark)</p>
          <p>2. Select preview mode to see how it will look</p>
          <p>3. Adjust colors using color picker or hex values</p>
          <p>4. Click "Apply Preview" to test changes instantly</p>
          <p>5. Use "Reset to Defaults" to start over</p>
        </div>
      </div>
    </div>
  );
}