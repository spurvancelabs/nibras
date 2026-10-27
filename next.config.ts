const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://api.cloudinary.com https://res.cloudinary.com${isDev ? ' ws: wss:' : ''}`,
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com',
  "media-src 'self' https: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    serverActions: { 
      bodySizeLimit: '2mb',
    },
  },
  // Optimize for Vercel deployment
  output: 'standalone',
  
  // Environment variable validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Only HTTPS for 2 years (Vercel serves HTTPS already).
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          // No camera / mic / location / payments needed by the LMS.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Content Security Policy: only our own scripts, Google Fonts,
          // Cloudinary uploads and YouTube recordings. Inline scripts stay
          // allowed because Next.js needs them for hydration.
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
  
  // Turbopack configuration (replaces webpack for Next.js 16+)
  turbopack: {
    resolveAlias: {
      // Turbopack equivalents for common webpack fallbacks
    },
  },
};

export default nextConfig;