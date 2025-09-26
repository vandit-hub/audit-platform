/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Production optimizations
  compress: true,

  // Output configuration
  // output: 'standalone', // Disabled to avoid clientReferenceManifest error

  // Image optimization
  images: {
    unoptimized: process.env.NODE_ENV === 'production' ? false : true,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;