import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@motionly/shared", "@motionly/video"],
};

export default nextConfig;
