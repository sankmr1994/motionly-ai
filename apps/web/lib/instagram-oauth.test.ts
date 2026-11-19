import { describe, expect, it } from "vitest";
import {
  buildInstagramAuthorizationUrl,
  decryptInstagramToken,
  encryptInstagramToken,
} from "./instagram-oauth";

describe("Instagram OAuth", () => {
  it("builds a state-bound Unified Login URL", () => {
    const url = buildInstagramAuthorizationUrl({
      appId: "app-123",
      configurationId: "config-456",
      redirectUri:
        "https://motionly.example/api/v1/integrations/instagram/oauth/callback",
      state: "one-time-state",
    });
    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.searchParams.get("config_id")).toBe("config-456");
    expect(url.searchParams.get("state")).toBe("one-time-state");
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("encrypts tokens without retaining plaintext", () => {
    const key = Buffer.alloc(32, 3).toString("base64");
    const encrypted = encryptInstagramToken("private-token", key);
    expect(JSON.stringify(encrypted)).not.toContain("private-token");
    expect(decryptInstagramToken(encrypted, key)).toBe("private-token");
  });
});
