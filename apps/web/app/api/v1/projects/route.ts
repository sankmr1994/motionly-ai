import { createProject, listProjects } from "@motionly/db";
import { createProjectRequestSchema } from "@motionly/shared";
import { auth } from "../../../../lib/auth";

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

export async function GET(request: Request) {
  const user = await getVerifiedUser(request);
  if (!user) return problem(401, "UNAUTHORIZED", "Sign in is required.");
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 20;
  const projects = await listProjects(user.id, limit);
  return Response.json({ data: projects });
}

export async function POST(request: Request) {
  const user = await getVerifiedUser(request);
  if (!user) return problem(401, "UNAUTHORIZED", "Sign in is required.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return problem(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
  const result = createProjectRequestSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      {
        type: "https://motionly.ai/problems/validation-failed",
        title: "Request validation failed",
        status: 422,
        code: "VALIDATION_FAILED",
        detail: "One or more project fields are invalid.",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        })),
      },
      { status: 422, headers: { "Content-Type": "application/problem+json" } },
    );
  }
  const project = await createProject(user.id, result.data);
  return Response.json(
    { data: project },
    {
      status: 201,
      headers: { Location: `/api/v1/projects/${project.id}` },
    },
  );
}
