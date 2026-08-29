/** @type {import('next').NextConfig} */

// SAKU Core API proxy: the browser ONLY ever talks to relative /api/proxy/* paths.
// ADR-024 fase 2: the static rewrite was replaced by a route handler
// (src/app/api/proxy/[...path]/route.ts) because the proxy now also has to translate the
// HttpOnly `saku_session` cookie into the `X-Saku-Session` header api-core expects — a
// rewrite cannot do that. Target host still comes from SAKU_API_INTERNAL_URL, read there.
const nextConfig = {
  transpilePackages: ['@saku/ledger-core'],
};

module.exports = nextConfig;
