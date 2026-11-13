import { createEditedProjectStoryboardRevision } from "@motionly/db";
import { editProjectStoryboardRequestSchema } from "@motionly/shared";
import { auth } from "../../../../../../lib/auth";

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
  context: { params: Promise<{ projectId: string }> },
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
  const parsed = editProjectStoryboardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return problem(
      422,
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "Storyboard edits are invalid.",
    );
  }
  const { projectId } = await context.params;
  const result = await createEditedProjectStoryboardRevision(
    session.user.id,
    projectId,
    parsed.data,
  );
  if (!result.ok) {
    if (result.reason === "not_found") {
      return problem(404, "NOT_FOUND", "Storyboard not found.");
    }
    if (result.reason === "invalid_edits") {
      return problem(
        422,
        "VALIDATION_FAILED",
        result.message ?? "Storyboard edits are invalid.",
      );
    }
    return problem(
      409,
      "VERSION_CONFLICT",
      result.reason === "no_changes"
        ? "At least one scene must change."
        : "The storyboard changed or cannot be edited right now.",
    );
  }
  return Response.json(
    {
      data: {
        versionId: result.versionId,
        revision: result.revision,
        status: "REVIEW_READY",
      },
    },
    { status: 201 },
  );
}
