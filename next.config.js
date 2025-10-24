/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify: true, // Removed deprecated option
  // output: 'export', // Commented out to allow WebAssembly modules
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    // Handle WebAssembly modules
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    return config;
  },
  images: {
    domains: ['example.com'], // Add domains for team logos
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig 