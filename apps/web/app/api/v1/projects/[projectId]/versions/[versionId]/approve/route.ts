import { approveProjectPlan } from "@motionly/db";
import { approveProjectVersionRequestSchema } from "@motionly/shared";
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
  context: {
    params: Promise<{ projectId: string; versionId: string }>;
  },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.emailVerified) {
    return problem(401, "UNAUTHORIZED", "Sign in is required.");
  }
  const { projectId, versionId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
  const parsed = approveProjectVersionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return problem(
      422,
      "VALIDATION_FAILED",
      "Approval confirmation and content hash are required.",
    );
  }
  const result = await approveProjectPlan(
    session.user.id,
    projectId,
    versionId,
    parsed.data.contentHash,
  );
  if (result === "not_found") {
    return problem(404, "NOT_FOUND", "Storyboard not found.");
  }
  if (result === "conflict") {
    return problem(
      409,
      "VERSION_CONFLICT",
      "The storyboard changed before approval.",
    );
  }
  return Response.json({ data: { status: "APPROVED", versionId } });
}
