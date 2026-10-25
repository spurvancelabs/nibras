// =============================================================================
// FILE: lib/user-agent.ts   (NEW FILE — client-safe)
// Turns a browser user-agent string into "Chrome on Windows" (sign-in history).
// =============================================================================

export function describeUserAgent(ua: string): { browser: string; os: string; mobile: boolean } {
  const s = ua || '';
  const browser = /Edg\//.test(s)
    ? 'Edge'
    : /OPR\/|Opera/.test(s)
      ? 'Opera'
      : /SamsungBrowser/.test(s)
        ? 'Samsung Internet'
        : /Firefox\//.test(s)
          ? 'Firefox'
          : /Chrome\//.test(s)
            ? 'Chrome'
            : /Safari\//.test(s)
              ? 'Safari'
              : s
                ? 'Browser'
                : 'Unknown';
  const os = /Windows/.test(s)
    ? 'Windows'
    : /Android/.test(s)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(s)
        ? 'iOS'
        : /Mac OS X|Macintosh/.test(s)
          ? 'macOS'
          : /CrOS/.test(s)
            ? 'ChromeOS'
            : /Linux/.test(s)
              ? 'Linux'
              : 'Unknown OS';
  return { browser, os, mobile: /Mobi|Android|iPhone/.test(s) };
}
