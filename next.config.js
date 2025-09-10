/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Skip TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization
  images: {
    domains: [
      'nkjihejhyrquyegmqimi.supabase.co', // Supabase storage
      'oaidalleapiprodscus.blob.core.windows.net', // DALL-E images
      'storage.googleapis.com', // Google storage
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Performance optimizations
  experimental: {
    optimizeCss: false, // Disable to avoid critters issue
    scrollRestoration: true,
  },

  // API routes configuration for larger payloads
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase body size limit for image uploads
    },
    responseLimit: '10mb', // Increase response size limit
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/api/image-groups',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

}

module.exports = nextConfig