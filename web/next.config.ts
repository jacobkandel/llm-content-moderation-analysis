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
        // Pre-computed JSON files — aggressively cached (only change on redeploy)
        source: '/:path(summary_stats|spectrum_data|heatmap_matrix|prompts_list|compare_data|reliability_scores|consensus_stats|political_compass|paternalism|clusters|drift_report)\\.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        // Other JSON/CSV files
        source: '/:path*\\.(json|csv)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=43200, stale-while-revalidate=86400' },
        ],
      },
      {
        // Compressed CSV data files
        source: '/:path*\\.csv\\.gz',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
          { key: 'Content-Type', value: 'application/gzip' },
        ],
      },
    ];
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
