/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  trailingSlash: true,
  images: {
    domains: ['example.com'], // Add domains for team logos
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig 