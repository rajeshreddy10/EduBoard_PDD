import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;
const isVercel = Boolean(process.env.VERCEL);
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
const basePath = isGithubActions && repoName && !isVercel ? `/${repoName}` : (process.env.NEXT_PUBLIC_BASE_PATH || '');

const nextConfig: NextConfig = {
  ...(isVercel ? {} : { output: 'export' }),
  basePath: basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  turbopack: {
    root: "../../",
  },
  poweredByHeader: false,
  allowedDevOrigins: [
    "10.101.120.243",
    "192.168.56.1",
    "localhost",
    "127.0.0.1"
  ],
};

export default nextConfig;
