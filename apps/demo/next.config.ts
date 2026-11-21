import type { NextConfig } from 'next';

const basePath = '/demo';

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_DEMO_BASE_PATH: basePath },
};

export default nextConfig;
