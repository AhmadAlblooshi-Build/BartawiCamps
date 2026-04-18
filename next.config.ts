import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    webpackBuildWorker: false,
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001'
    return [{ source: '/api/:path*', destination: `${apiBase}/api/:path*` }]
  },
  transpilePackages: ['jspdf', 'jspdf-autotable'],
}

export default nextConfig
