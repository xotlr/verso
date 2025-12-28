import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Next.js 16: Turbopack is default. Empty config acknowledges plugins' webpack additions.
  turbopack: {},

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
};

export default withBundleAnalyzer(withSerwist(nextConfig));
