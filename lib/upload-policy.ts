// =============================================================================
// FILE: lib/upload-policy.ts   (NEW FILE — client-safe)
// What files and links the LMS accepts. Checked in the browser before an
// upload (friendly message) AND on the server before anything is saved
// (the real protection — the browser check can be bypassed).
//   - attachments must be https links on res.cloudinary.com (our uploads)
//   - programs / system scripts (.exe, .bat, .apk …) are refused
//   - external "link" materials must be plain http(s) links
// =============================================================================

export const MAX_UPLOAD_MB = 50;

/**
 * Never accepted: programs and system scripts that run when opened.
 * (Code files such as .js / .py / .html stay allowed — coding courses need
 * them, and they are only ever downloaded, never run inside the LMS.)
 */
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'ps1', 'vbs', 'vbe', 'jse', 'wsf', 'hta', 'jar', 'apk', 'app', 'dll', 'dmg', 'iso', 'lnk', 'reg', 'cpl', 'msc',
]);

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]{1,10})$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : '';
}

/** Browser-side check before uploading. Returns an error message or null. */
export function checkFileBeforeUpload(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name);
  if (BLOCKED_EXTENSIONS.has(ext)) return `.${ext} files can't be uploaded for safety. Try a PDF, image or document instead.`;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `That file is larger than ${MAX_UPLOAD_MB} MB.`;
  return null;
}

export function isHttpUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isCloudinaryUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

/** Server check for a stored attachment record. */
export function attachmentAllowed(a: { url: string; format?: string; originalName?: string; size?: number }): boolean {
  if (!isCloudinaryUrl(a.url)) return false;
  const ext = (a.format || extensionOf(a.originalName ?? '') || extensionOf(new URL(a.url).pathname)).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  if ((a.size ?? 0) > MAX_UPLOAD_MB * 1024 * 1024 * 2) return false;
  return true;
}
