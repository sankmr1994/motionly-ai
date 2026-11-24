import { describe, expect, it } from "vitest";
import {
  buildInstagramAuthorizationUrl,
  decryptInstagramToken,
  encryptInstagramToken,
  resolveInstagramProviderAccount,
} from "./instagram-oauth";
import { afterEach, vi } from "vitest";

vi.mock("@motionly/config", () => ({
  getInstagramConfig: () => ({
    graphVersion: "v27.0",
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("resolves the Instagram asset assigned by Unified Login", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "system-user-123" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "instagram-456",
                username: "motionly.video",
                name: "Motionly Video",
                account_type: "CREATOR",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    await expect(
      resolveInstagramProviderAccount("system-user-token"),
    ).resolves.toEqual({
      id: "instagram-456",
      username: "motionly.video",
      name: "Motionly Video",
      accountType: "CREATOR",
      apiHost: "graph.facebook.com",
    });

    expect(fetchMock.mock.calls[1]?.[0].toString()).toContain(
      "/system-user-123/assigned_instagram_accounts",
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        Authorization: "Bearer system-user-token",
      },
    });
  });
});
