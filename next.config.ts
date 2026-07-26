import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor Android emulator loads via http://10.0.2.2:3000
  allowedDevOrigins: [
    "10.0.2.2",
    "127.0.0.1",
    "localhost",
    "192.168.254.135",
  ],
  transpilePackages: [
    "three",
    "meshline",
    "@react-three/fiber",
    "@react-three/drei",
    "@react-three/rapier",
  ],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.corenexis.com",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
      {
        protocol: "https",
        hostname: "cdn1.iconfinder.com",
      },
    ],
  },
};

export default nextConfig;
