import { ObjectId } from "mongodb";
import { getDatabase } from "./index";

type ProjectDocument = {
  _id: ObjectId;
  ownerId: string;
  title: string;
  status: string;
  archivedAt?: Date;
  updatedAt: Date;
};

type UserDocument = {
  _id: ObjectId;
  id?: string;
  name?: string;
  email?: string;
};

type NarrationJobDocument = {
  ownerId: string;
  projectId: ObjectId;
  status: "GENERATING" | "COMPLETED" | "FAILED";
  updatedAt: Date;
  scenes?: Array<{ assetKey?: string }>;
};

type RenderJobDocument = {
  ownerId: string;
  projectId: ObjectId;
  status: "RENDERING" | "COMPLETED" | "FAILED";
  review: { status: "PENDING" | "APPROVED" };
  updatedAt: Date;
  output?: { assetKey?: string };
};

export type AdminMediaProject = {
  id: string;
  title: string;
  storyboardStatus: string;
  narrationStatus: "NOT_STARTED" | NarrationJobDocument["status"];
  videoStatus:
    "NOT_STARTED" | "RENDERING" | "FAILED" | "READY_TO_REVIEW" | "APPROVED";
  narrationAssetKeys: string[];
  videoAssetKeys: string[];
  updatedAt: string;
};

export type AdminMediaOwner = {
  ownerId: string;
  name: string;
  email: string;
  r2Prefix: string;
  projectCount: number;
  projects: AdminMediaProject[];
};

function latestByProject<T extends { projectId: ObjectId; updatedAt: Date }>(
  jobs: T[],
) {
  const latest = new Map<string, T>();
  jobs.forEach((job) => {
    const projectId = job.projectId.toHexString();
    const current = latest.get(projectId);
    if (!current || job.updatedAt > current.updatedAt)
      latest.set(projectId, job);
  });
  return latest;
}

export async function listAdminMediaOwners(): Promise<AdminMediaOwner[]> {
  const database = await getDatabase();
  const projects = await database
    .collection<ProjectDocument>("projects")
    .find(
      { status: { $ne: "ARCHIVED" }, archivedAt: { $exists: false } },
      { sort: { updatedAt: -1 } },
    )
    .toArray();
  const ownerIds = [...new Set(projects.map((project) => project.ownerId))];
  if (ownerIds.length === 0) return [];

  const objectIds = ownerIds
    .filter((ownerId) => ObjectId.isValid(ownerId))
    .map((ownerId) => new ObjectId(ownerId));
  const users = await database
    .collection<UserDocument>("users")
    .find(
      {
        $or: [
          { id: { $in: ownerIds } },
          ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
        ],
      },
      { projection: { id: 1, name: 1, email: 1 } },
    )
    .toArray();
  const usersById = new Map<string, UserDocument>();
  users.forEach((user) => {
    usersById.set(user._id.toHexString(), user);
    if (user.id) usersById.set(user.id, user);
  });

  const projectIds = projects.map((project) => project._id);
  const [narrationJobs, renderJobs] = await Promise.all([
    database
      .collection<NarrationJobDocument>("narrationJobs")
      .find({ ownerId: { $in: ownerIds }, projectId: { $in: projectIds } })
      .toArray(),
    database
      .collection<RenderJobDocument>("renderJobs")
      .find({ ownerId: { $in: ownerIds }, projectId: { $in: projectIds } })
      .toArray(),
  ]);
  const latestNarration = latestByProject(narrationJobs);
  const latestRender = latestByProject(renderJobs);

  return ownerIds.map((ownerId) => {
    const user = usersById.get(ownerId);
    const ownerProjects = projects.filter(
      (project) => project.ownerId === ownerId,
    );
    return {
      ownerId,
      name: user?.name?.trim() || "Unknown user",
      email: user?.email?.trim() || "Email unavailable",
      r2Prefix: `users/${ownerId}/`,
      projectCount: ownerProjects.length,
      projects: ownerProjects.map((project) => {
        const projectId = project._id.toHexString();
        const projectNarrationJobs = narrationJobs.filter(
          (job) => job.projectId.toHexString() === projectId,
        );
        const projectRenderJobs = renderJobs.filter(
          (job) => job.projectId.toHexString() === projectId,
        );
        const narration = latestNarration.get(projectId);
        const render = latestRender.get(projectId);
        return {
          id: projectId,
          title: project.title,
          storyboardStatus: project.status,
          narrationStatus: narration?.status ?? "NOT_STARTED",
          videoStatus: !render
            ? "NOT_STARTED"
            : render.status === "COMPLETED"
              ? render.review.status === "APPROVED"
                ? "APPROVED"
                : "READY_TO_REVIEW"
              : render.status,
          narrationAssetKeys: [
            ...new Set(
              projectNarrationJobs.flatMap((job) =>
                (job.scenes ?? []).flatMap((scene) =>
                  scene.assetKey ? [scene.assetKey] : [],
                ),
              ),
            ),
          ],
          videoAssetKeys: [
            ...new Set(
              projectRenderJobs.flatMap((job) =>
                job.output?.assetKey ? [job.output.assetKey] : [],
              ),
            ),
          ],
          updatedAt: project.updatedAt.toISOString(),
        };
      }),
    };
  });
}
