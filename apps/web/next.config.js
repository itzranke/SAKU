/** @type {import('next').NextConfig} */

// SAKU Core API proxy: the browser ONLY ever talks to relative /api/proxy/* paths.
// Next.js (server-side) forwards them to the NestJS API, so the preview/deploy
// environment works without exposing localhost to client code.
const SAKU_API_INTERNAL_URL = process.env.SAKU_API_INTERNAL_URL || 'http://localhost:4000';

const nextConfig = {
  transpilePackages: ['@saku/ledger-core'],
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${SAKU_API_INTERNAL_URL}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
