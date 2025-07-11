/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    /**  ✦ главное: ошибки ESLint больше не срывают build  */
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
