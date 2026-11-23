import { describe, expect, it } from "vitest";
import {
  getAdminEmails,
  parseServerEnv,
  resolveVideoRenderProvider,
} from "./index";

describe("server environment", () => {
  it("uses safe local defaults", () => {
    const environment = parseServerEnv({});

    expect(environment.APP_ENV).toBe("local");
    expect(environment.APP_URL).toBe("http://localhost:3000");
    expect(environment.LOG_LEVEL).toBe("info");
    expect(environment.GEMINI_IMAGE_MODEL).toBe("gemini-3.1-flash-lite-image");
    expect(environment.SCENE_VISUAL_PROVIDER).toBe("procedural");
    expect(environment.PORTFOLIO_VIDEO_LIMIT).toBe(3);
  });

  it("rejects invalid public URLs", () => {
    expect(() => parseServerEnv({ APP_URL: "motionly" })).toThrow(
      "Invalid server environment",
    );
  });

  it("derives a stable preview origin from Vercel system variables", () => {
    const environment = parseServerEnv({
      VERCEL_ENV: "preview",
      VERCEL_URL: "motionly-commit.vercel.app",
      VERCEL_BRANCH_URL: "motionly-git-develop.vercel.app",
    });

    expect(environment.APP_ENV).toBe("preview");
    expect(environment.APP_URL).toBe("https://motionly-git-develop.vercel.app");
  });

  it("keeps an explicit production origin authoritative", () => {
    const environment = parseServerEnv({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "motionly-ai.vercel.app",
      APP_ENV: "production",
      APP_URL: "https://motionly.example",
    });

    expect(environment.APP_ENV).toBe("production");
    expect(environment.APP_URL).toBe("https://motionly.example");
  });

  it("selects Vercel Sandbox for hosted environments", () => {
    expect(resolveVideoRenderProvider({ APP_ENV: "preview" })).toBe(
      "vercel-sandbox",
    );
    expect(resolveVideoRenderProvider({ APP_ENV: "local" })).toBe("local");
  });

  it("never starts the local child renderer in a hosted environment", () => {
    expect(
      resolveVideoRenderProvider({
        APP_ENV: "production",
        VIDEO_RENDER_PROVIDER: "local",
      }),
    ).toBe("vercel-sandbox");
  });

  it("allows Sandbox verification from a local environment", () => {
    expect(
      resolveVideoRenderProvider({
        APP_ENV: "local",
        VIDEO_RENDER_PROVIDER: "vercel-sandbox",
      }),
    ).toBe("vercel-sandbox");
  });

  it("requires all R2 settings together", () => {
    expect(() =>
      parseServerEnv({
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      }),
    ).toThrow("All Cloudflare R2 settings must be configured together");
  });

  it("allows Gemini artwork only when explicitly selected", () => {
    const environment = parseServerEnv({
      SCENE_VISUAL_PROVIDER: "gemini",
      PORTFOLIO_VIDEO_LIMIT: "5",
    });
    expect(environment.SCENE_VISUAL_PROVIDER).toBe("gemini");
    expect(environment.PORTFOLIO_VIDEO_LIMIT).toBe(5);
  });

  it("accepts a complete account-scoped R2 configuration", () => {
    const environment = parseServerEnv({
      R2_ACCOUNT_ID: "account",
      R2_BUCKET_NAME: "motionly-ai-media",
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "access-key",
      R2_SECRET_ACCESS_KEY: "secret-key",
    });

    expect(environment.R2_BUCKET_NAME).toBe("motionly-ai-media");
  });

  it("rejects an R2 endpoint from a different account", () => {
    expect(() =>
      parseServerEnv({
        R2_ACCOUNT_ID: "expected",
        R2_BUCKET_NAME: "motionly-ai-media",
        R2_ENDPOINT: "https://different.r2.cloudflarestorage.com",
        R2_ACCESS_KEY_ID: "access-key",
        R2_SECRET_ACCESS_KEY: "secret-key",
      }),
    ).toThrow("R2_ENDPOINT must be the HTTPS endpoint for R2_ACCOUNT_ID");
  });

  it("parses a normalized admin email allowlist", () => {
    process.env.MOTIONLY_ADMIN_EMAILS = " Owner@Example.com,team@example.com ";
    expect(getAdminEmails()).toEqual(["owner@example.com", "team@example.com"]);
    delete process.env.MOTIONLY_ADMIN_EMAILS;
  });

  it("requires the complete Instagram configuration", () => {
    expect(() => parseServerEnv({ META_APP_ID: "123456" })).toThrow(
      "All Meta Instagram settings must be configured together",
    );
  });

  it("requires an HTTPS Instagram callback", () => {
    expect(() =>
      parseServerEnv({
        META_APP_ID: "123456",
        META_APP_SECRET: "secret",
        META_INSTAGRAM_CONFIG_ID: "config",
        META_INSTAGRAM_REDIRECT_URI:
          "http://localhost:3000/api/v1/integrations/instagram/oauth/callback",
        INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      }),
    ).toThrow("META_INSTAGRAM_REDIRECT_URI must use HTTPS");
  });
});
