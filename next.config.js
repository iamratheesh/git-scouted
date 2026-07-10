/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/remove-bg',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://localhost:5328/api/remove-bg'
          : '/api/remove-bg'
      }
    ];
  }
};

module.exports = nextConfig;
