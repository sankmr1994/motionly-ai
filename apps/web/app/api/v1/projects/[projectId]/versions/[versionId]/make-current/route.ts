import { makeProjectStoryboardRevisionCurrent } from "@motionly/db";
import { makeProjectVersionCurrentRequestSchema } from "@motionly/shared";
import { auth } from "../../../../../../../../lib/auth";

function problem(status: number, code: string, detail: string) {
  return Response.json(
    {
      type: `https://motionly.ai/problems/${code.toLowerCase().replaceAll("_", "-")}`,
      title: detail,
      status,
      code,
      detail,
    },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; versionId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.emailVerified) {
    return problem(401, "UNAUTHORIZED", "Sign in is required.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
  if (!makeProjectVersionCurrentRequestSchema.safeParse(body).success) {
    return problem(
      422,
      "VALIDATION_FAILED",
      "Make-current confirmation is required.",
    );
  }
  const { projectId, versionId } = await context.params;
  const result = await makeProjectStoryboardRevisionCurrent(
    session.user.id,
    projectId,
    versionId,
  );
  if (result === "not_found") {
    return problem(404, "NOT_FOUND", "Storyboard revision not found.");
  }
  if (result !== "selected") {
    return problem(
      409,
      "VERSION_CONFLICT",
      result === "current"
        ? "This revision is already current."
        : "The project cannot switch to this revision right now.",
    );
  }
  return Response.json({ data: { status: "REVIEW_READY" } });
}
