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
