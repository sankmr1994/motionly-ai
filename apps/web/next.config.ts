import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const workspaceEnvironment = resolve(process.cwd(), "../../.env.local");
if (existsSync(workspaceEnvironment)) {
  process.loadEnvFile(workspaceEnvironment);
}

const nextConfig: NextConfig = {
  transpilePackages: ["@motionly/ai", "@motionly/shared", "@motionly/video"],
};

export default nextConfig;
