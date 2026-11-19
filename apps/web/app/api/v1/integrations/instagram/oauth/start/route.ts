import { getInstagramConfig } from "@motionly/config";
import { createInstagramOAuthState } from "@motionly/db";
import { NextResponse } from "next/server";
import { auth } from "../../../../../../../lib/auth";
import { buildInstagramAuthorizationUrl } from "../../../../../../../lib/instagram-oauth";

const stateCookieName = "motionly_instagram_oauth_state";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.emailVerified) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    const config = getInstagramConfig();
    const state = await createInstagramOAuthState(session.user.id);
    const authorizationUrl = buildInstagramAuthorizationUrl({
      appId: config.appId,
      configurationId: config.configurationId,
      redirectUri: config.redirectUri,
      state,
    });
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(stateCookieName, state, {
      httpOnly: true,
      secure: config.redirectUri.startsWith("https://"),
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/v1/integrations/instagram/oauth/callback",
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/settings?instagram=not-configured", request.url),
    );
  }
}
