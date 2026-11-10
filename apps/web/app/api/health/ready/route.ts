import { getServerEnv } from "@motionly/config";
import { checkDatabaseConnection } from "@motionly/db";
import { createRequestContext, logger } from "@motionly/observability";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request.headers);
  const environment = getServerEnv();
  const database = await checkDatabaseConnection();
  const ready = database.status === "ok";

  logger[ready ? "info" : "warn"]("health.ready", {
    ...context,
    databaseStatus: database.status,
  });

  return NextResponse.json(
    {
      status: ready ? "ok" : "not_ready",
      service: "motionly-web",
      environment: environment.APP_ENV,
      checks: { database },
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "cache-control": "no-store",
        "x-request-id": context.requestId,
      },
    },
  );
}
