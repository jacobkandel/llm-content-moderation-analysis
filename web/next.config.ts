import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPwa = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/**',
      },
    ],
  },
  async headers() {
    return [
      // NOTE: Security headers (CSP, HSTS, X-Frame-Options, etc.) are set
      // exclusively in middleware.ts to avoid conflicting values.

      {
        // Gzipped prompts list — served as JSON with gzip encoding
        source: '/prompts_list.json.gz',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Pre-computed JSON files — aggressively cached (only change on redeploy)
        source: '/:path(summary_stats|spectrum_data|heatmap_matrix|prompts_list|compare_data|reliability_scores|consensus_stats|political_compass|paternalism|clusters|drift_report)\\.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Other JSON/CSV files
        source: '/:path*\\.(json|csv)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=43200' },
        ],
      },
      {
        // Compressed CSV data files — cache for 24h (only change on audit runs)
        source: '/:path*\\.csv\\.gz',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=43200' },
          { key: 'Content-Type', value: 'application/gzip' },
        ],
      },
    ];
  },
  serverExternalPackages: ['better-sqlite3']
};

export default withBundleAnalyzer(withPwa(nextConfig));
