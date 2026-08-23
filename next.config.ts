import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  experimental: {
    optimizePackageImports: ["@react-three/drei", "@react-three/fiber", "three"],
  },
};

export default nextConfig;
