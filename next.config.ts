import type { NextConfig } from "next";
import type { Configuration } from "webpack";
import withSerwistInit from "@serwist/next";
import bundleAnalyzer from "@next/bundle-analyzer";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebpackObfuscator = require("webpack-obfuscator");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable in dev or when using webpack mode (DISABLE_PWA=true for obfuscated builds)
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "true",
});

const nextConfig: NextConfig = {
  // Next.js 16: Turbopack is default. Empty config acknowledges plugins' webpack additions.
  turbopack: {},

  // Explicitly disable source maps in production (defense in depth with post-build removal)
  productionBrowserSourceMaps: false,

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: deny all unless explicitly allowed
              "default-src 'self'",
              // Scripts: self + inline for Next.js hydration (unsafe-inline required for Next.js)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com",
              // Styles: self + inline for Tailwind/styled components
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: self + data URIs + Supabase storage + Google/GitHub avatars
              "img-src 'self' data: blob: https://akqcitwkiabfyyqukzus.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
              // Fonts: self + Google Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Connect: self + Supabase + Stripe
              "connect-src 'self' https://akqcitwkiabfyyqukzus.supabase.co wss://akqcitwkiabfyyqukzus.supabase.co https://api.stripe.com",
              // Frames: Stripe checkout only
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
              // Object/media restrictions
              "object-src 'none'",
              "media-src 'self' blob:",
              // WASM execution
              "script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              // Form submissions
              "form-action 'self'",
              // Frame ancestors (clickjacking prevention)
              "frame-ancestors 'self'",
              // Base URI restriction
              "base-uri 'self'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === 'production' ? "upgrade-insecure-requests" : "",
            ].filter(Boolean).join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },

  // Fix workspace root detection (multiple lockfiles issue)
  outputFileTracingRoot: __dirname,

  // Allow Supabase storage images with optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'akqcitwkiabfyyqukzus.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    // Optimize image sizes for common breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Enable modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
  },

  // Enable subdomain routing for local development
  // Access: localhost:3000 (landing) and app.localhost:3000 (app)
  // Note: Add "127.0.0.1 app.localhost" to /etc/hosts for local subdomain testing
  async rewrites() {
    return {
      beforeFiles: [
        // Handle app.localhost subdomain in development
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'app.localhost' }],
          destination: '/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // WebAssembly is loaded dynamically from /public/wasm/ via fetch
  // No webpack/turbopack config needed - WASM served as static assets

  // Production obfuscation (webpack mode only, use `next build --webpack`)
  webpack: (config: Configuration, { isServer, dev }: { isServer: boolean; dev: boolean }) => {
    if (!isServer && !dev) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new WebpackObfuscator(
          {
            // Low-memory preset for Vercel standard containers
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false, // Disabled - major memory hog
            debugProtection: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: "hexadecimal",
            renameGlobals: false, // Required for Next.js compatibility
            rotateStringArray: true,
            selfDefending: false,
            shuffleStringArray: true,
            simplify: true,
            splitStrings: false, // Disabled - reduces memory
            stringArray: true,
            stringArrayEncoding: ["none"], // Changed from base64 - less memory
            stringArrayThreshold: 0.4, // Reduced from 0.75
            transformObjectKeys: false, // Disabled - reduces memory
          },
          [
            // Exclude framework code from obfuscation
            "**/node_modules/**",
            "**/_next/static/chunks/polyfills*.js",
            "**/_next/static/chunks/framework*.js",
            "**/_next/static/chunks/webpack*.js",
            "**/sw.js",
            "**/sw.ts",
          ]
        )
      );
    }
    return config;
  },
};

export default withBundleAnalyzer(withSerwist(nextConfig));
