/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint is run separately in CI; don't fail production builds on lint.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
