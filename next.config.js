/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, crypto: false, stream: false, path: false };
    return config;
  },
};
module.exports = nextConfig;