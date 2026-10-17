/**
 * Client-safe URL helpers for Cloudinary assets.
 * No server-only imports.
 *
 * Rules:
 *  - Raw files (docx, xlsx, zip, etc.) — do NOT add fl_attachment.
 *    Cloudinary already downloads raw files by default, and adding the flag
 *    (especially with a filename containing special chars) causes
 *    ERR_INVALID_RESPONSE in the browser.
 *  - Image / video files — add fl_attachment so PDFs and images download
 *    instead of opening inline. Filename is sanitized because Cloudinary
 *    rejects characters like ( ) in the fl_attachment value.
 */

export function cloudinaryDownloadUrl(url: string, filename?: string): string {
  if (!url) return url;
  if (!url.includes('res.cloudinary.com')) return url;

  // Raw resources: leave untouched. Default behavior is download.
  if (url.includes('/raw/upload/')) return url;

  // Video resources: default is already download for most cases; leave as-is
  // unless we ever need a filename override.
  if (url.includes('/video/upload/')) {
    return url.replace(/(\/upload\/)/, '$1fl_attachment/');
  }

  // Image resources (includes PDFs stored as image): force download.
  if (filename) {
    const clean = filename
      .replace(/\.[^.]+$/, '')        // strip extension
      .replace(/[^\w\s!\-]/g, '_')    // keep letters, numbers, _, space, -, !
      .trim();
    if (clean) {
      return url.replace(
        /(\/upload\/)/,
        `$1fl_attachment:${encodeURIComponent(clean)}/`
      );
    }
  }

  return url.replace(/(\/upload\/)/, '$1fl_attachment/');
}