import {
  deleteDraftProject,
  renameProject,
  setProjectArchived,
} from "@motionly/db";
import { updateProjectRequestSchema } from "@motionly/shared";
import { auth } from "../../../../../lib/auth";

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

async function getVerifiedUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.emailVerified ? session.user : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getVerifiedUser(request);
  if (!user) return problem(401, "UNAUTHORIZED", "Sign in is required.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
  const result = updateProjectRequestSchema.safeParse(body);
  if (!result.success) {
    return problem(422, "VALIDATION_FAILED", "Project fields are invalid.");
  }

  const { projectId } = await context.params;
  let project =
    result.data.title !== undefined
      ? await renameProject(user.id, projectId, result.data.title)
      : null;
  if (result.data.archived !== undefined) {
    project = await setProjectArchived(
      user.id,
      projectId,
      result.data.archived,
    );
  }
  if (!project) return problem(404, "NOT_FOUND", "Project not found.");
  return Response.json({ data: project });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await getVerifiedUser(request);
  if (!user) return problem(401, "UNAUTHORIZED", "Sign in is required.");
  const { projectId } = await context.params;
  const result = await deleteDraftProject(user.id, projectId);
  if (result === "not_found") {
    return problem(404, "NOT_FOUND", "Project not found.");
  }
  if (result === "not_draft") {
    return problem(
      409,
      "PROJECT_NOT_DRAFT",
      "Only draft projects can be permanently deleted.",
    );
  }
  return new Response(null, { status: 204 });
}
