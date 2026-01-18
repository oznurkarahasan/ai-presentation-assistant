/**
 * Minimal Next.js config to avoid Turbopack/webpack conflict on Next 16+
 * Setting an empty `turbopack` config silences the build-time error
 * while keeping default Turbopack behavior.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
};

module.exports = nextConfig;
