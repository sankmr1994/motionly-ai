import { getInstagramConfig } from "@motionly/config";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedInstagramToken = {
  algorithm: "aes-256-gcm";
  keyVersion: "1";
  iv: string;
  authTag: string;
  ciphertext: string;
};

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: { message?: string; type?: string; code?: number };
};

export type InstagramProviderAccount = {
  id: string;
  username?: string;
  name?: string;
  accountType?: string;
  apiHost: "graph.instagram.com" | "graph.facebook.com";
};

function encryptionKey(value: string) {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("Instagram token encryption is not configured correctly.");
  }
  return key;
}

export function encryptInstagramToken(
  token: string,
  keyValue: string,
): EncryptedInstagramToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyValue), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return {
    algorithm: "aes-256-gcm",
    keyVersion: "1",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptInstagramToken(
  token: EncryptedInstagramToken,
  keyValue: string,
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyValue),
    Buffer.from(token.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(token.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(token.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function buildInstagramAuthorizationUrl(input: {
  appId: string;
  configurationId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://www.facebook.com/dialog/oauth");
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("config_id", input.configurationId);
  url.searchParams.set("display", "popup");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  return url;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string; type?: string; code?: number } })
    | null;
  if (!response.ok || !body) {
    const details = body?.error;
    const suffix = [details?.type, details?.code]
      .filter((value) => value !== undefined)
      .join("/");
    throw new Error(
      `Meta did not complete the Instagram request${suffix ? ` (${suffix})` : ""}.`,
    );
  }
  return body;
}

type FacebookInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  account_type?: string;
};

async function readFacebookInstagramAccounts(
  url: URL,
  accessToken: string,
) {
  const result = await readJson<{ data?: FacebookInstagramAccount[] }>(
    await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
  return result.data ?? [];
}

export async function exchangeInstagramAuthorizationCode(code: string) {
  const config = getInstagramConfig();
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });
  const result = await readJson<TokenResponse>(
    await fetch(
      `https://graph.facebook.com/${config.graphVersion}/oauth/access_token`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    ),
  );
  if (!result.access_token || result.error) {
    throw new Error("Meta did not return an Instagram access token.");
  }
  return {
    accessToken: result.access_token,
    expiresIn: result.expires_in,
    scopes: result.scope?.split(",").filter(Boolean) ?? [],
  };
}

export async function resolveInstagramProviderAccount(
  accessToken: string,
): Promise<InstagramProviderAccount> {
  const { graphVersion } = getInstagramConfig();

  // Unified Login returns a system-user token with the selected Instagram
  // asset assigned directly to that user. It does not require a Facebook Page.
  try {
    const meUrl = new URL(
      `https://graph.facebook.com/${graphVersion}/me`,
    );
    meUrl.searchParams.set("fields", "id");
    const me = await readJson<{ id?: string }>(
      await fetch(meUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );
    if (me.id) {
      const assignedUrl = new URL(
        `https://graph.facebook.com/${graphVersion}/${me.id}/assigned_instagram_accounts`,
      );
      assignedUrl.searchParams.set(
        "fields",
        "id,username,name,profile_picture_url,account_type",
      );
      const assigned = await readFacebookInstagramAccounts(
        assignedUrl,
        accessToken,
      );
      const selected = assigned[0];
      if (selected) {
        return {
          id: selected.id,
          username: selected.username,
          name: selected.name,
          accountType: selected.account_type,
          apiHost: "graph.facebook.com",
        };
      }
    }
  } catch {
    // Continue with legacy Page-linked and Instagram-only token fallbacks.
  }

  const pagesUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/me/accounts`,
  );
  pagesUrl.searchParams.set(
    "fields",
    "id,name,instagram_business_account{id,username,name,profile_picture_url}",
  );
  try {
    const pages = await readJson<{
      data?: Array<{
        instagram_business_account?: {
          id: string;
          username?: string;
          name?: string;
        };
      }>;
    }>(
      await fetch(pagesUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );
    const linked = pages.data
      ?.map((page) => page.instagram_business_account)
      .find(Boolean);
    if (linked) return { ...linked, apiHost: "graph.facebook.com" };
  } catch {
    // Instagram-only tokens are resolved by graph.instagram.com below.
  }

  const instagramUrl = new URL("https://graph.instagram.com/me");
  instagramUrl.searchParams.set(
    "fields",
    "id,user_id,username,name,account_type",
  );
  const direct = await readJson<{
    id?: string;
    user_id?: string;
    username?: string;
    name?: string;
    account_type?: string;
  }>(
    await fetch(instagramUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
  const id = direct.user_id ?? direct.id;
  if (!id) throw new Error("No eligible Instagram account was returned.");
  return {
    id,
    username: direct.username,
    name: direct.name,
    accountType: direct.account_type,
    apiHost: "graph.instagram.com",
  };
}
