/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['nkjihejhyrquyegmqimi.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nkjihejhyrquyegmqimi.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
