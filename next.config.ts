import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
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

  // Enable WebAssembly support for the pagination engine
  webpack: (config, { isServer }) => {
    // Enable WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Fix for WASM in workers
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },
};

export default withSerwist(nextConfig);
