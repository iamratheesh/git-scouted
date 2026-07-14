/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push(({ context, request }, callback) => {
        if (/^onnxruntime-web(\/.*)?$/.test(request)) {
          return callback(null, 'ort');
        }
        callback();
      });

      if (isServer) {
        config.externals.push(
          '@imgly/background-removal',
          'onnxruntime-node'
        );
      }
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'onnxruntime-node': false,
        'module': false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
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










