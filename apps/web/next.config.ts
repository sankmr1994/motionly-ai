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
      "../../packages/video/package.json",
      "../../packages/shared/src/**/*",
      "../../packages/shared/package.json",
      "node_modules/@remotion/studio/**/*",
      "node_modules/@remotion/timeline-utils/**/*",
      "node_modules/mediabunny/**/*",
      "node_modules/remotion/**/*",
    ],
  },
};

export default nextConfig;
