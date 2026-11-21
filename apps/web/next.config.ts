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
      "../../node_modules/.pnpm/@mediabunny+*/node_modules/@mediabunny/**/*",
      "../../node_modules/.pnpm/@remotion+web-renderer@*/node_modules/**/*",
      "../../node_modules/.pnpm/mediabunny@*/node_modules/mediabunny/**/*",
      "../../node_modules/.pnpm/zod@*/node_modules/zod/**/*",
      "node_modules/@jridgewell/**/*",
      "node_modules/@mediabunny/**/*",
      "node_modules/@remotion/**/*",
      "node_modules/@remotion/studio/**/*",
      "node_modules/@remotion/timeline-utils/**/*",
      "node_modules/@tanstack/**/*",
      "node_modules/client-zip/**/*",
      "node_modules/mediabunny/**/*",
      "node_modules/memfs/**/*",
      "node_modules/open/**/*",
      "node_modules/prismjs/**/*",
      "node_modules/remotion/**/*",
      "node_modules/semver/**/*",
      "node_modules/zod/**/*",
    ],
  },
};

export default nextConfig;
