// =============================================================================
// FILE: components/palette-events.ts   (NEW FILE — client-safe, tiny)
// Opening the command palette without loading its code. The palette itself
// (components/CommandPalette.tsx) is downloaded the first time it is opened.
// =============================================================================

export const OPEN_PALETTE_EVENT = 'lms-open-palette';

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}
