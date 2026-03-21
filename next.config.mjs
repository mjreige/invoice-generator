/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Remove all console.log statements in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Better page caching to prevent back button reloads
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
