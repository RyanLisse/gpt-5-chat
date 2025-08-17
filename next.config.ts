import type { NextConfig } from 'next';

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled:
    process.env.ANALYZE === 'true' || process.env.BUNDLE_ANALYZE !== undefined,
  openAnalyzer: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  experimental: {
    ppr: false, // Disable PPR for stable version compatibility
    optimizePackageImports: [
      'react-tweet',
      'echarts-for-react',
      '@lobehub/icons',
    ],
  },
  // Temporarily removed external packages configuration for faster compilation
  // serverExternalPackages: ['@trpc/server', '@tanstack/react-query'],
  // transpilePackages: ['@trpc/client', '@trpc/tanstack-react-query'],
  // Turbopack configuration for development builds
  turbopack: {
    // Configure resolve extensions for optimal module resolution
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
    // Configure aliases for common library mappings
    resolveAlias: {
      // Add any specific aliases if needed in the future
    },
    // Configure rules for specific file types if needed
    rules: {
      // Built-in support for CSS and modern JavaScript compilation
      // Custom rules can be added here as needed
    },
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '**',
      },
      {
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Bundle analysis configuration
    // Note: Bundle analyzer uses Webpack and works with production builds
    // For development with Turbopack (--turbo), bundle analysis is not available
    if (process.env.BUNDLE_ANALYZE) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

      const analyzeMode = process.env.BUNDLE_ANALYZE;
      if (analyzeMode === 'server' && isServer) {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../analyze/server.html',
            openAnalyzer: false,
          }),
        );
      } else if (analyzeMode === 'browser' && !isServer) {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../analyze/client.html',
            openAnalyzer: false,
          }),
        );
      } else if (analyzeMode === 'both') {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: isServer
              ? '../analyze/server.html'
              : '../analyze/client.html',
            openAnalyzer: false,
          }),
        );
      }
    }

    return config;
  },
  async headers() {
    await Promise.resolve();
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
