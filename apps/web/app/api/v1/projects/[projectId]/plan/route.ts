import { auth } from "../../../../../../lib/auth";
import { planProjectForOwner } from "../../../../../../lib/project-planning";

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
  const { projectId } = await context.params;
  const result = await planProjectForOwner(session.user.id, projectId);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return problem(404, "NOT_FOUND", "Project not found.");
    }
    if (result.reason === "generation_failed") {
      return problem(
        503,
        "PLANNING_FAILED",
        "The storyboard could not be generated right now.",
      );
    }
    if (result.reason === "reference_not_relevant") {
      return problem(
        422,
        "REFERENCE_NOT_RELEVANT",
        "The reference does not appear to match the video idea.",
      );
    }
    return problem(
      409,
      result.reason === "already_planning"
        ? "PLANNING_IN_PROGRESS"
        : "PROJECT_NOT_READY",
      result.reason === "already_planning"
        ? "A storyboard is already being created."
        : "The project cannot be planned in its current state.",
    );
  }
  return Response.json({ data: result.plan }, { status: 201 });
}
