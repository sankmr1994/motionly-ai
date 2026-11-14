import {
  storyboardSchema,
  type NarrationJobStatus,
  type NarrationSceneStatus,
  type ProjectStatus,
  type Storyboard,
} from "@motionly/shared";
import { ObjectId } from "mongodb";
import { getDatabase, getDatabaseClient } from "./index";

type NarrationSceneDocument = {
  sceneId: string;
  title: string;
  narration: string;
  status: NarrationSceneStatus;
  assetKey?: string;
  mimeType?: "audio/mpeg";
  byteLength?: number;
  durationSeconds?: number;
  alignment?: {
    characters: string[];
    characterStartTimesSeconds: number[];
    characterEndTimesSeconds: number[];
  };
  generatedAt?: Date;
};

type NarrationJobDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  versionId: ObjectId;
  approvedContentHash: string;
  revision: number;
  status: NarrationJobStatus;
  progress: number;
  attempt: number;
  voice: {
    provider: "ELEVENLABS";
    model: string;
    displayName: string;
  };
  scenes: NarrationSceneDocument[];
  error?: {
    code: "NARRATION_GENERATION_FAILED";
    safeMessage: string;
    retryable: true;
    occurredAt: Date;
  };
  createdAt: Date;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  schemaVersion: "1";
};

type ProjectDocument = {
  _id: ObjectId;
  ownerId: string;
  status: ProjectStatus;
  currentVersionId: ObjectId;
  revisionCounter: number;
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

export type NarrationJobView = {
  id: string;
  projectId: string;
  versionId: string;
  revision: number;
  status: NarrationJobStatus;
  progress: number;
  attempt: number;
  voice: NarrationJobDocument["voice"];
  scenes: Array<{
    sceneId: string;
    title: string;
    narration: string;
    status: NarrationSceneStatus;
    durationSeconds?: number;
    audioReady: boolean;
  }>;
  error?: { safeMessage: string; retryable: true };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type NarrationGenerationInput = {
  jobId: string;
  projectId: string;
  versionId: string;
  scenes: Array<{
    sceneId: string;
    title: string;
    narration: string;
  }>;
};

const toObjectId = (value: string) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;

const toView = (job: NarrationJobDocument): NarrationJobView => ({
  id: job._id.toHexString(),
  projectId: job.projectId.toHexString(),
  versionId: job.versionId.toHexString(),
  revision: job.revision,
  status: job.status,
  progress: job.progress,
  attempt: job.attempt,
  voice: job.voice,
  scenes: job.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    title: scene.title,
    narration: scene.narration,
    status: scene.status,
    durationSeconds: scene.durationSeconds,
    audioReady: Boolean(scene.assetKey && scene.status === "READY"),
  })),
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

export function getNarrationReadiness(
  projectStatus: ProjectStatus,
  approvalStatus: ProjectVersionDocument["approval"]["status"],
) {
  return projectStatus === "APPROVED" && approvalStatus === "APPROVED"
    ? ("ready" as const)
    : ("not_approved" as const);
}

export async function beginNarrationGeneration(
  ownerId: string,
  projectId: string,
  voice: NarrationJobDocument["voice"],
): Promise<
  | { ok: true; input: NarrationGenerationInput }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_approved"
        | "already_generating"
        | "already_completed";
      jobId?: string;
    }
> {
  const id = toObjectId(projectId);
  if (!id) return { ok: false, reason: "not_found" };
  const database = await getDatabase();
  const session = getDatabaseClient().startSession();
  try {
    let outcome:
      | { ok: true; input: NarrationGenerationInput }
      | {
          ok: false;
          reason:
            | "not_found"
            | "not_approved"
            | "already_generating"
            | "already_completed";
          jobId?: string;
        } = { ok: false, reason: "not_found" };
    await session.withTransaction(async () => {
      const project = await database
        .collection<ProjectDocument>("projects")
        .findOne({ _id: id, ownerId }, { session });
      if (!project) return;
      const version = await database
        .collection<ProjectVersionDocument>("projectVersions")
        .findOne(
          {
            _id: project.currentVersionId,
            projectId: id,
            ownerId,
          },
          { session },
        );
      if (
        !version?.storyboard ||
        getNarrationReadiness(project.status, version.approval.status) !==
          "ready" ||
        version.approval.approvedContentHash !== version.contentHash
      ) {
        outcome = { ok: false, reason: "not_approved" };
        return;
      }
      const storyboard = storyboardSchema.safeParse(version.storyboard);
      if (!storyboard.success) {
        outcome = { ok: false, reason: "not_approved" };
        return;
      }
      const latest = await database
        .collection<NarrationJobDocument>("narrationJobs")
        .findOne(
          { ownerId, projectId: id, versionId: version._id },
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
      if (latest?.status === "GENERATING") {
        const staleBefore = Date.now() - 2 * 60 * 1_000;
        if (latest.updatedAt.getTime() > staleBefore) {
          outcome = {
            ok: false,
            reason: "already_generating",
            jobId: latest._id.toHexString(),
          };
          return;
        }
        const interruptedAt = new Date();
        await database
          .collection<NarrationJobDocument>("narrationJobs")
          .updateOne(
            { _id: latest._id, ownerId, status: "GENERATING" },
            {
              $set: {
                status: "FAILED",
                progress: 100,
                error: {
                  code: "NARRATION_GENERATION_FAILED",
                  safeMessage:
                    "The previous narration attempt was interrupted. Please retry.",
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
      const attempt = (latest?.attempt ?? 0) + 1;
      const scenes = storyboard.data.scenes.map((scene, index) => ({
        sceneId: scene.id,
        title: scene.title ?? `Scene ${index + 1}`,
        narration: scene.narration,
        status: "PENDING" as const,
      }));
      await database
        .collection<NarrationJobDocument>("narrationJobs")
        .insertOne(
          {
            _id: jobId,
            ownerId,
            projectId: id,
            versionId: version._id,
            approvedContentHash: version.contentHash,
            revision: version.revision,
            status: "GENERATING",
            progress: 5,
            attempt,
            voice,
            scenes,
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
          projectId: id.toHexString(),
          versionId: version._id.toHexString(),
          scenes: scenes.map(({ sceneId, title, narration }) => ({
            sceneId,
            title,
            narration,
          })),
        },
      };
    });
    return outcome;
  } finally {
    await session.endSession();
  }
}

export async function completeNarrationScene(
  ownerId: string,
  jobId: string,
  sceneId: string,
  asset: {
    assetKey: string;
    byteLength: number;
    durationSeconds: number;
    alignment: {
      characters: string[];
      characterStartTimesSeconds: number[];
      characterEndTimesSeconds: number[];
    };
  },
) {
  const id = toObjectId(jobId);
  if (!id) throw new Error("Narration job was not found.");
  const database = await getDatabase();
  const job = await database
    .collection<NarrationJobDocument>("narrationJobs")
    .findOne({ _id: id, ownerId, status: "GENERATING" });
  if (!job) throw new Error("Narration job is no longer active.");
  const generatedAt = new Date();
  const updated = await database
    .collection<NarrationJobDocument>("narrationJobs")
    .updateOne(
      {
        _id: id,
        ownerId,
        status: "GENERATING",
        scenes: { $elemMatch: { sceneId, status: "PENDING" } },
      },
      {
        $set: {
          "scenes.$.status": "READY",
          "scenes.$.assetKey": asset.assetKey,
          "scenes.$.mimeType": "audio/mpeg",
          "scenes.$.byteLength": asset.byteLength,
          "scenes.$.durationSeconds": asset.durationSeconds,
          "scenes.$.alignment": asset.alignment,
          "scenes.$.generatedAt": generatedAt,
          progress: Math.min(
            95,
            5 +
              Math.round(
                ((job.scenes.filter((scene) => scene.status === "READY")
                  .length +
                  1) /
                  job.scenes.length) *
                  90,
              ),
          ),
          updatedAt: generatedAt,
        },
      },
    );
  if (!updated.modifiedCount) {
    throw new Error("Narration scene could not be completed.");
  }
}

export async function completeNarrationGeneration(
  ownerId: string,
  jobId: string,
) {
  const id = toObjectId(jobId);
  if (!id) throw new Error("Narration job was not found.");
  const database = await getDatabase();
  const now = new Date();
  const result = await database
    .collection<NarrationJobDocument>("narrationJobs")
    .updateOne(
      {
        _id: id,
        ownerId,
        status: "GENERATING",
        scenes: { $not: { $elemMatch: { status: { $ne: "READY" } } } },
      },
      {
        $set: {
          status: "COMPLETED",
          progress: 100,
          updatedAt: now,
          completedAt: now,
        },
      },
    );
  if (!result.modifiedCount) {
    throw new Error("Narration generation could not be completed.");
  }
}

export async function failNarrationGeneration(ownerId: string, jobId: string) {
  const id = toObjectId(jobId);
  if (!id) return;
  const database = await getDatabase();
  const now = new Date();
  await database.collection<NarrationJobDocument>("narrationJobs").updateOne(
    { _id: id, ownerId, status: "GENERATING" },
    {
      $set: {
        status: "FAILED",
        progress: 100,
        error: {
          code: "NARRATION_GENERATION_FAILED",
          safeMessage:
            "We could not generate the narration. Your approved storyboard is safe—please retry.",
          retryable: true,
          occurredAt: now,
        },
        updatedAt: now,
        completedAt: now,
      },
    },
  );
}

export async function getLatestNarrationJob(
  ownerId: string,
  projectId: string,
): Promise<NarrationJobView | null> {
  const id = toObjectId(projectId);
  if (!id) return null;
  const database = await getDatabase();
  const job = await database
    .collection<NarrationJobDocument>("narrationJobs")
    .findOne({ ownerId, projectId: id }, { sort: { createdAt: -1 } });
  return job ? toView(job) : null;
}

export async function getNarrationSceneAsset(
  ownerId: string,
  projectId: string,
  jobId: string,
  sceneId: string,
) {
  const projectObjectId = toObjectId(projectId);
  const jobObjectId = toObjectId(jobId);
  if (!projectObjectId || !jobObjectId) return null;
  const database = await getDatabase();
  const job = await database
    .collection<NarrationJobDocument>("narrationJobs")
    .findOne({
      _id: jobObjectId,
      ownerId,
      projectId: projectObjectId,
      status: "COMPLETED",
    });
  const scene = job?.scenes.find((candidate) => candidate.sceneId === sceneId);
  if (!scene?.assetKey || scene.status !== "READY") return null;
  return {
    assetKey: scene.assetKey,
    mimeType: scene.mimeType ?? "audio/mpeg",
    byteLength: scene.byteLength,
  };
}
