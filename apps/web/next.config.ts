import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "../../",
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  allowedDevOrigins: [
    "10.101.120.243",
    "192.168.56.1",
    "localhost",
    "127.0.0.1"
  ],
  async headers() {
    return [
      // Security headers applied to every response
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=*, microphone=*, geolocation=*" },
        ],
      },
      // Long-lived font cache
      {
        source: '/(.*)\\.(woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl.endsWith('/api') ? apiUrl : apiUrl + '/api'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
