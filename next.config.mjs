/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
