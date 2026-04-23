import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ],
      },
      {
        // Gzipped prompts list — served as JSON with gzip encoding
        source: '/prompts_list.json.gz',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Content-Encoding', value: 'gzip' },
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
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
        // Compressed CSV data files — cache for 24h (only change on audit runs)
        source: '/:path*\\.csv\\.gz',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=86400' },
          { key: 'Content-Type', value: 'application/gzip' },
        ],
      },
    ];
  },
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
