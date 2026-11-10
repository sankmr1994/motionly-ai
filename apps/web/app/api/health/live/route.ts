import { createRequestContext, logger } from "@motionly/observability";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const context = createRequestContext(request.headers);

  logger.info("health.live", context);

  return NextResponse.json(
    {
      status: "ok",
      service: "motionly-web",
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-request-id": context.requestId,
      },
    },
  );
}
