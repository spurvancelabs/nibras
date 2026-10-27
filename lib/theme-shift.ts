// =============================================================================
// FILE: lib/theme-shift.ts   (NEW FILE — client)
// Smooth colour shift for theme / style / light-dark changes.
//   smoothThemeChange(() => toggleSomething())        synchronous change
//   smoothThemeChange(() => router.refresh(), 700)    change that lands later
// Uses a View Transition cross-fade when the browser supports it (GPU, no
// re-layout) and otherwise briefly animates colours (CSS in globals.css).
// Does nothing special for people who prefer reduced motion.
// =============================================================================

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

let timer: ReturnType<typeof setTimeout> | null = null;

function reduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

export function smoothThemeChange(update: () => void, asyncMs = 0): void {
  if (typeof document === 'undefined' || reduced()) {
    update();
    return;
  }
  const d = document as Doc;
  if (!asyncMs && typeof d.startViewTransition === 'function') {
    try {
      d.startViewTransition(update);
      return;
    } catch {
      /* fall through */
    }
  }
  const html = document.documentElement;
  html.classList.add('theme-shifting');
  update();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => html.classList.remove('theme-shifting'), Math.max(420, asyncMs));
}
