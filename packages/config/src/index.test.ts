import { describe, expect, it } from "vitest";
import { getAdminEmails, parseServerEnv } from "./index";

describe("server environment", () => {
  it("uses safe local defaults", () => {
    const environment = parseServerEnv({});

    expect(environment.APP_ENV).toBe("local");
    expect(environment.APP_URL).toBe("http://localhost:3000");
    expect(environment.LOG_LEVEL).toBe("info");
  });

  it("rejects invalid public URLs", () => {
    expect(() => parseServerEnv({ APP_URL: "motionly" })).toThrow(
      "Invalid server environment",
    );
  });

  it("requires all R2 settings together", () => {
    expect(() =>
      parseServerEnv({
        R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      }),
    ).toThrow("All Cloudflare R2 settings must be configured together");
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
