import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@intent-driven-interface/frontend',
    '@intent-driven-interface/backend',
  ],
};

export default nextConfig;
