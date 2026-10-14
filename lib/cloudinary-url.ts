/**
 * Client-safe URL helpers for Cloudinary assets.
 * No server-only imports.
 */

export function cloudinaryDownloadUrl(url: string, filename?: string): string {
  if (!url) return url;
  if (!url.includes('res.cloudinary.com')) return url;

  const clean = filename ? filename.replace(/\.[^.]+$/, '') : '';
  const flag = clean
    ? `fl_attachment:${encodeURIComponent(clean)}`
    : 'fl_attachment';

  return url.replace(/(\/upload\/)/, `$1${flag}/`);
}