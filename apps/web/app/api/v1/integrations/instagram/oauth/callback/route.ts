import { getInstagramConfig } from "@motionly/config";
import {
  consumeInstagramOAuthState,
  saveInstagramConnection,
} from "@motionly/db";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import {
  encryptInstagramToken,
  exchangeInstagramAuthorizationCode,
  resolveInstagramProviderAccount,
} from "../../../../../../../lib/instagram-oauth";

const stateCookieName = "motionly_instagram_oauth_state";

function settingsRedirect(request: Request, result: string) {
  const response = NextResponse.redirect(
    new URL(`/dashboard/settings?instagram=${result}&popup=1`, request.url),
  );
  response.cookies.set(stateCookieName, "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/api/v1/integrations/instagram/oauth/callback",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.emailVerified) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  if (url.searchParams.has("error")) {
    return settingsRedirect(request, "cancelled");
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get(stateCookieName)?.value;
  if (!code || !state || !cookieState || cookieState !== state) {
    return settingsRedirect(request, "invalid-state");
  }

  const stateIsValid = await consumeInstagramOAuthState(session.user.id, state);
  if (!stateIsValid) return settingsRedirect(request, "invalid-state");

  try {
    const config = getInstagramConfig();
    const token = await exchangeInstagramAuthorizationCode(code);
    const account = await resolveInstagramProviderAccount(token.accessToken);
    await saveInstagramConnection({
      ownerId: session.user.id,
      providerAccountId: account.id,
      username: account.username,
      displayName: account.name,
      accountType: account.accountType,
      token: encryptInstagramToken(token.accessToken, config.encryptionKey),
      grantedScopes: token.scopes,
      tokenExpiresAt: token.expiresIn
        ? new Date(Date.now() + token.expiresIn * 1_000)
        : undefined,
    });
    return settingsRedirect(request, "connected");
  } catch {
    return settingsRedirect(request, "failed");
  }
}
