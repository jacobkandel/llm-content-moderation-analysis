import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
      {
        // Pre-computed JSON files — aggressively cached
        source: '/:path(summary_stats|spectrum_data|heatmap_matrix)\\.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Supplementary JSON/CSV files (clusters, drift, political, etc.)
        source: '/:path*\\.(json|csv)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=1800, stale-while-revalidate=86400' },
        ],
      },
      {
        // Compressed CSV data files
        source: '/:path*\\.csv\\.gz',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=3600' },
          { key: 'Content-Type', value: 'application/gzip' },
        ],
      },
    ];
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
