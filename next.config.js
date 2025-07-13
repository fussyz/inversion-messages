/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,      // → ESLint-ошибки не валят билд
  },
  typescript: {
    ignoreBuildErrors: true,       // → TypeScript-ошибки не валят билд
  },
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
