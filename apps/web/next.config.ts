import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const workspaceEnvironment = resolve(process.cwd(), "../../.env.local");
if (existsSync(workspaceEnvironment)) {
  process.loadEnvFile(workspaceEnvironment);
}

const nextConfig: NextConfig = {
  transpilePackages: ["@motionly/ai", "@motionly/shared", "@motionly/video"],
  serverExternalPackages: ["@remotion/bundler", "@remotion/studio"],
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/*": [
      "../../packages/video/src/**/*",
      "node_modules/@remotion/studio/**/*",
    ],
  },
};

export default nextConfig;
