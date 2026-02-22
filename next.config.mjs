/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid flaky filesystem cache writes that can fail with ENOENT in some local envs.
      config.cache = false;
    }
    return config;
  }
};

export default nextConfig;
