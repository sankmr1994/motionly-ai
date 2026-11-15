import {
  captionReviewSchema,
  storyboardSchema,
  type CaptionReview,
  type ProjectStatus,
  type RenderJobStatus,
  type Storyboard,
  type VideoReviewStatus,
} from "@motionly/shared";
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase, getDatabaseClient } from "./index";

type ProjectDocument = {
  _id: ObjectId;
  ownerId: string;
  status: ProjectStatus;
  currentVersionId: ObjectId;
};

type ProjectVersionDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  revision: number;
  storyboard?: Storyboard;
  contentHash: string;
  approval: {
    status: "DRAFT" | "REVIEW_READY" | "APPROVED";
    approvedContentHash?: string;
  };
};

type NarrationJobDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  versionId: ObjectId;
  status: "GENERATING" | "COMPLETED" | "FAILED";
  scenes: Array<{
    sceneId: string;
    assetKey?: string;
    durationSeconds?: number;
    status: "PENDING" | "READY";
  }>;
  captions?: CaptionReview & {
    approvedAt?: Date;
  };
};

type RenderJobDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  versionId: ObjectId;
  narrationJobId: ObjectId;
  revision: number;
  inputHash: string;
  pipelineVersion?: string;
  captionVersion: number;
  captionStyle: CaptionReview["style"];
  status: RenderJobStatus;
  progress: number;
  attempt: number;
  output?: {
    assetKey: string;
    mimeType: "video/mp4";
    byteLength: number;
    durationSeconds: number;
    width: 720;
    height: 1280;
    fps: 30;
  };
  review: {
    status: VideoReviewStatus;
    approvedAt?: Date;
  };
  error?: {
    code: "VIDEO_RENDER_FAILED";
    safeMessage: string;
    retryable: true;
    internalFingerprint?: string;
    occurredAt: Date;
  };
  createdAt: Date;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  schemaVersion: "1";
};

export type VideoRenderInput = {
  jobId: string;
  projectId: string;
  versionId: string;
  narrationJobId: string;
  storyboard: Storyboard;
  sceneAudio: Array<{
    sceneId: string;
    assetKey: string;
    durationSeconds: number;
  }>;
  captions: CaptionReview;
};

export type VideoRenderJobView = {
  id: string;
  projectId: string;
  versionId: string;
  narrationJobId: string;
  revision: number;
  status: RenderJobStatus;
  progress: number;
  attempt: number;
  pipelineVersion: string;
  captionStyle: CaptionReview["style"];
  reviewStatus: VideoReviewStatus;
  output?: Omit<NonNullable<RenderJobDocument["output"]>, "assetKey">;
  error?: { safeMessage: string; retryable: true };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type VideoLibraryRenderState = {
  jobId: string;
  status: RenderJobStatus;
  progress: number;
  reviewStatus: VideoReviewStatus;
  completedAt?: string;
};

const toObjectId = (value: string) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;

const toView = (job: RenderJobDocument): VideoRenderJobView => ({
  id: job._id.toHexString(),
  projectId: job.projectId.toHexString(),
  versionId: job.versionId.toHexString(),
  narrationJobId: job.narrationJobId.toHexString(),
  revision: job.revision,
  status: job.status,
  progress: job.progress,
  attempt: job.attempt,
  pipelineVersion: job.pipelineVersion ?? "legacy",
  captionStyle: job.captionStyle,
  reviewStatus: job.review.status,
  ...(job.output
    ? {
        output: {
          mimeType: job.output.mimeType,
          byteLength: job.output.byteLength,
          durationSeconds: job.output.durationSeconds,
          width: job.output.width,
          height: job.output.height,
          fps: job.output.fps,
        },
      }
    : {}),
  ...(job.error
    ? {
        error: {
          safeMessage: job.error.safeMessage,
          retryable: job.error.retryable,
        },
      }
    : {}),
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
  ...(job.completedAt ? { completedAt: job.completedAt.toISOString() } : {}),
});

export function getVideoRenderReadiness(
  projectStatus: ProjectStatus,
  approvalStatus: ProjectVersionDocument["approval"]["status"],
  narrationStatus: NarrationJobDocument["status"],
  captionStatus?: CaptionReview["status"],
) {
  return projectStatus === "APPROVED" &&
    approvalStatus === "APPROVED" &&
    narrationStatus === "COMPLETED" &&
    captionStatus === "APPROVED"
    ? ("ready" as const)
    : ("not_ready" as const);
}

export const VIDEO_RENDER_PIPELINE_VERSION = "2026-11-14.2";

export async function beginVideoRender(
  ownerId: string,
  projectId: string,
): Promise<
  | { ok: true; input: VideoRenderInput }
  | {
      ok: false;
      reason:
        "not_found" | "not_ready" | "already_rendering" | "already_completed";
      jobId?: string;
    }
> {
  const projectObjectId = toObjectId(projectId);
  if (!projectObjectId) return { ok: false, reason: "not_found" };
  const database = await getDatabase();
  const session = getDatabaseClient().startSession();
  try {
    let outcome:
      | { ok: true; input: VideoRenderInput }
      | {
          ok: false;
          reason:
            | "not_found"
            | "not_ready"
            | "already_rendering"
            | "already_completed";
          jobId?: string;
        } = { ok: false, reason: "not_found" };
    await session.withTransaction(async () => {
      const project = await database
        .collection<ProjectDocument>("projects")
        .findOne({ _id: projectObjectId, ownerId }, { session });
      if (!project) return;
      const version = await database
        .collection<ProjectVersionDocument>("projectVersions")
        .findOne(
          {
            _id: project.currentVersionId,
            projectId: projectObjectId,
            ownerId,
          },
          { session },
        );
      const storyboard = storyboardSchema.safeParse(version?.storyboard);
      if (!version || !storyboard.success) {
        outcome = { ok: false, reason: "not_ready" };
        return;
      }
      const narration = await database
        .collection<NarrationJobDocument>("narrationJobs")
        .findOne(
          {
            ownerId,
            projectId: projectObjectId,
            versionId: version._id,
            status: "COMPLETED",
          },
          { session, sort: { createdAt: -1 } },
        );
      const captions = captionReviewSchema.safeParse(narration?.captions);
      if (
        !narration ||
        !captions.success ||
        getVideoRenderReadiness(
          project.status,
          version.approval.status,
          narration.status,
          captions.data.status,
        ) !== "ready" ||
        version.approval.approvedContentHash !== version.contentHash ||
        narration.scenes.some(
          (scene) =>
            scene.status !== "READY" ||
            !scene.assetKey ||
            !scene.durationSeconds,
        )
      ) {
        outcome = { ok: false, reason: "not_ready" };
        return;
      }
      const inputHash = createHash("sha256")
        .update(
          `${version.contentHash}:${narration._id.toHexString()}:${captions.data.version}:${VIDEO_RENDER_PIPELINE_VERSION}`,
        )
        .digest("hex");
      const latest = await database
        .collection<RenderJobDocument>("renderJobs")
        .findOne(
          { ownerId, projectId: projectObjectId, inputHash },
          { session, sort: { createdAt: -1 } },
        );
      if (latest?.status === "COMPLETED") {
        outcome = {
          ok: false,
          reason: "already_completed",
          jobId: latest._id.toHexString(),
        };
        return;
      }
      if (latest?.status === "RENDERING") {
        const staleBefore = Date.now() - 15 * 60 * 1_000;
        if (latest.updatedAt.getTime() > staleBefore) {
          outcome = {
            ok: false,
            reason: "already_rendering",
            jobId: latest._id.toHexString(),
          };
          return;
        }
        const interruptedAt = new Date();
        await database.collection<RenderJobDocument>("renderJobs").updateOne(
          { _id: latest._id, ownerId, status: "RENDERING" },
          {
            $set: {
              status: "FAILED",
              progress: 100,
              error: {
                code: "VIDEO_RENDER_FAILED",
                safeMessage:
                  "The previous video render was interrupted. Please retry.",
                retryable: true,
                occurredAt: interruptedAt,
              },
              updatedAt: interruptedAt,
              completedAt: interruptedAt,
            },
          },
          { session },
        );
      }
      const now = new Date();
      const jobId = new ObjectId();
      await database.collection<RenderJobDocument>("renderJobs").insertOne(
        {
          _id: jobId,
          ownerId,
          projectId: projectObjectId,
          versionId: version._id,
          narrationJobId: narration._id,
          revision: version.revision,
          inputHash,
          pipelineVersion: VIDEO_RENDER_PIPELINE_VERSION,
          captionVersion: captions.data.version,
          captionStyle: captions.data.style,
          status: "RENDERING",
          progress: 5,
          attempt: (latest?.attempt ?? 0) + 1,
          review: { status: "PENDING" },
          createdAt: now,
          startedAt: now,
          updatedAt: now,
          schemaVersion: "1",
        },
        { session },
      );
      outcome = {
        ok: true,
        input: {
          jobId: jobId.toHexString(),
          projectId,
          versionId: version._id.toHexString(),
          narrationJobId: narration._id.toHexString(),
          storyboard: storyboard.data,
          sceneAudio: narration.scenes.map((scene) => ({
            sceneId: scene.sceneId,
            assetKey: scene.assetKey!,
            durationSeconds: scene.durationSeconds!,
          })),
          captions: captions.data,
        },
      };
    });
    return outcome;
  } finally {
    await session.endSession();
  }
}

export async function updateVideoRenderProgress(
  ownerId: string,
  jobId: string,
  progress: number,
) {
  const id = toObjectId(jobId);
  if (!id) return;
  await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .updateOne(
      { _id: id, ownerId, status: "RENDERING" },
      {
        $set: {
          progress: Math.max(5, Math.min(99, Math.round(progress))),
          updatedAt: new Date(),
        },
      },
    );
}

export async function completeVideoRender(
  ownerId: string,
  jobId: string,
  output: NonNullable<RenderJobDocument["output"]>,
) {
  const id = toObjectId(jobId);
  if (!id) throw new Error("Render job was not found.");
  const now = new Date();
  const result = await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .updateOne(
      { _id: id, ownerId, status: "RENDERING" },
      {
        $set: {
          status: "COMPLETED",
          progress: 100,
          output,
          updatedAt: now,
          completedAt: now,
        },
      },
    );
  if (!result.modifiedCount) throw new Error("Render could not be completed.");
}

export async function failVideoRender(
  ownerId: string,
  jobId: string,
  internalError?: unknown,
) {
  const id = toObjectId(jobId);
  if (!id) return;
  const now = new Date();
  await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .updateOne(
      { _id: id, ownerId, status: "RENDERING" },
      {
        $set: {
          status: "FAILED",
          progress: 100,
          error: {
            code: "VIDEO_RENDER_FAILED",
            safeMessage:
              "We could not render the video. Your approved storyboard, narration, and captions are safe—please retry.",
            retryable: true,
            ...(internalError
              ? {
                  internalFingerprint: createHash("sha256")
                    .update(
                      internalError instanceof Error
                        ? `${internalError.name}:${internalError.message}`
                        : String(internalError),
                    )
                    .digest("hex")
                    .slice(0, 16),
                }
              : {}),
            occurredAt: now,
          },
          updatedAt: now,
          completedAt: now,
        },
      },
    );
}

export async function getLatestVideoRenderJob(
  ownerId: string,
  projectId: string,
) {
  const id = toObjectId(projectId);
  if (!id) return null;
  const job = await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .findOne({ ownerId, projectId: id }, { sort: { createdAt: -1 } });
  return job ? toView(job) : null;
}

export async function listLatestVideoRenderJobs(
  ownerId: string,
  projectIds: string[],
): Promise<Record<string, VideoLibraryRenderState>> {
  if (!ownerId.trim() || projectIds.length === 0) return {};
  const ids = projectIds
    .map(toObjectId)
    .filter((id): id is ObjectId => id !== null);
  if (ids.length === 0) return {};

  const jobs = await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .aggregate<RenderJobDocument>([
      { $match: { ownerId, projectId: { $in: ids } } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$projectId", latest: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latest" } },
    ])
    .toArray();
  const latest: Record<string, VideoLibraryRenderState> = {};
  for (const job of jobs) {
    const projectId = job.projectId.toHexString();
    if (latest[projectId]) continue;
    latest[projectId] = {
      jobId: job._id.toHexString(),
      status: job.status,
      progress: Math.max(0, Math.min(100, job.progress)),
      reviewStatus: job.review.status,
      ...(job.completedAt
        ? { completedAt: job.completedAt.toISOString() }
        : {}),
    };
  }
  return latest;
}

export async function getRenderedVideoAsset(
  ownerId: string,
  projectId: string,
  jobId: string,
) {
  const projectObjectId = toObjectId(projectId);
  const jobObjectId = toObjectId(jobId);
  if (!projectObjectId || !jobObjectId) return null;
  const job = await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .findOne({
      _id: jobObjectId,
      ownerId,
      projectId: projectObjectId,
      status: "COMPLETED",
    });
  return job?.output
    ? {
        assetKey: job.output.assetKey,
        mimeType: job.output.mimeType,
        byteLength: job.output.byteLength,
        reviewStatus: job.review.status,
      }
    : null;
}

export async function approveRenderedVideo(
  ownerId: string,
  projectId: string,
  jobId: string,
) {
  const projectObjectId = toObjectId(projectId);
  const jobObjectId = toObjectId(jobId);
  if (!projectObjectId || !jobObjectId) return { ok: false as const };
  const now = new Date();
  const result = await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .updateOne(
      {
        _id: jobObjectId,
        ownerId,
        projectId: projectObjectId,
        status: "COMPLETED",
        "review.status": "PENDING",
      },
      {
        $set: {
          "review.status": "APPROVED",
          "review.approvedAt": now,
          updatedAt: now,
        },
      },
    );
  if (result.modifiedCount) return { ok: true as const };
  const existing = await (
    await getDatabase()
  )
    .collection<RenderJobDocument>("renderJobs")
    .findOne({
      _id: jobObjectId,
      ownerId,
      projectId: projectObjectId,
      status: "COMPLETED",
      "review.status": "APPROVED",
    });
  return existing ? { ok: true as const } : { ok: false as const };
}
