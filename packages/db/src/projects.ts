import type {
  CreateProjectRequest,
  ProjectInputMode,
  ProjectStatus,
  VideoDefaults,
} from "@motionly/shared";
import { createHash } from "node:crypto";
import {
  ObjectId,
  type ClientSession,
  type Collection,
  type Filter,
} from "mongodb";
import { getDatabase, getDatabaseClient } from "./index";

type ProjectDocument = {
  _id: ObjectId;
  ownerId: string;
  title: string;
  inputMode: ProjectInputMode;
  topic?: string;
  status: ProjectStatus;
  currentVersionId: ObjectId;
  videoDefaults: VideoDefaults;
  revisionCounter: number;
  recordVersion: number;
  previousStatus?: ProjectStatus;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: "1";
};

type ProjectVersionDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  revision: number;
  source: {
    inputMode: ProjectInputMode;
    topic?: string;
    sourceScript?: string;
  };
  videoDefaults: VideoDefaults;
  contentHash: string;
  approval: { status: "DRAFT" };
  createdAt: Date;
  schemaVersion: "1";
};

export type ProjectSummary = {
  id: string;
  title: string;
  inputMode: ProjectInputMode;
  topic?: string;
  status: ProjectStatus;
  currentVersionId: string;
  video: VideoDefaults;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDraft = ProjectSummary & {
  content: string;
};

export function buildOwnedProjectsFilter(
  ownerId: string,
  archived = false,
): Filter<ProjectDocument> {
  const normalizedOwnerId = ownerId.trim();
  if (!normalizedOwnerId) throw new Error("A project owner is required.");
  return archived
    ? { ownerId: normalizedOwnerId, status: "ARCHIVED" }
    : {
        ownerId: normalizedOwnerId,
        status: { $nin: ["ARCHIVED", "DELETING"] },
      };
}

function projectCollection(
  database: Awaited<ReturnType<typeof getDatabase>>,
): Collection<ProjectDocument> {
  return database.collection<ProjectDocument>("projects");
}

function toSummary(project: ProjectDocument): ProjectSummary {
  return {
    id: project._id.toHexString(),
    title: project.title,
    inputMode: project.inputMode,
    ...(project.topic ? { topic: project.topic } : {}),
    status: project.status,
    currentVersionId: project.currentVersionId.toHexString(),
    video: project.videoDefaults,
    archived: project.status === "ARCHIVED",
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function contentHash(input: CreateProjectRequest): string {
  const source = input.inputMode === "TOPIC" ? input.topic : input.sourceScript;
  return `sha256:${createHash("sha256").update(source).digest("hex")}`;
}

async function insertProject(
  ownerId: string,
  input: CreateProjectRequest,
  session: ClientSession,
): Promise<ProjectDocument> {
  const database = await getDatabase();
  const now = new Date();
  const projectId = new ObjectId();
  const versionId = new ObjectId();
  const project: ProjectDocument = {
    _id: projectId,
    ownerId,
    title: input.title,
    inputMode: input.inputMode,
    ...(input.inputMode === "TOPIC" ? { topic: input.topic } : {}),
    status: "DRAFT",
    currentVersionId: versionId,
    videoDefaults: input.video,
    revisionCounter: 1,
    recordVersion: 1,
    createdAt: now,
    updatedAt: now,
    schemaVersion: "1",
  };
  const version: ProjectVersionDocument = {
    _id: versionId,
    ownerId,
    projectId,
    revision: 1,
    source:
      input.inputMode === "TOPIC"
        ? { inputMode: "TOPIC", topic: input.topic }
        : { inputMode: "SCRIPT", sourceScript: input.sourceScript },
    videoDefaults: input.video,
    contentHash: contentHash(input),
    approval: { status: "DRAFT" },
    createdAt: now,
    schemaVersion: "1",
  };

  await database
    .collection<ProjectVersionDocument>("projectVersions")
    .insertOne(version, { session });
  await projectCollection(database).insertOne(project, { session });
  return project;
}

export async function createProject(
  ownerId: string,
  input: CreateProjectRequest,
): Promise<ProjectSummary> {
  await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let created: ProjectDocument | undefined;
    await session.withTransaction(async () => {
      created = await insertProject(ownerId, input, session);
    });
    if (!created) throw new Error("Project creation did not complete.");
    return toSummary(created);
  } finally {
    await session.endSession();
  }
}

export async function listProjects(
  ownerId: string,
  limit = 20,
  options: { archived?: boolean } = {},
): Promise<ProjectSummary[]> {
  const database = await getDatabase();
  const projects = await projectCollection(database)
    .find(buildOwnedProjectsFilter(ownerId, options.archived))
    .sort({ updatedAt: -1, _id: -1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .toArray();
  return projects.map(toSummary);
}

export async function getProjectDraft(
  ownerId: string,
  projectId: string,
): Promise<ProjectDraft | null> {
  const id = toObjectId(projectId);
  if (!id) return null;
  const database = await getDatabase();
  const project = await projectCollection(database).findOne({
    _id: id,
    ownerId,
    status: "DRAFT",
  });
  if (!project) return null;
  const version = await database
    .collection<ProjectVersionDocument>("projectVersions")
    .findOne({ _id: project.currentVersionId, projectId: id, ownerId });
  if (!version) return null;
  const content =
    version.source.inputMode === "TOPIC"
      ? (version.source.topic ?? "")
      : (version.source.sourceScript ?? "");
  return { ...toSummary(project), content };
}

function toObjectId(projectId: string): ObjectId | null {
  return ObjectId.isValid(projectId) ? new ObjectId(projectId) : null;
}

export async function updateProjectDraft(
  ownerId: string,
  projectId: string,
  input: CreateProjectRequest,
): Promise<ProjectSummary | null> {
  const id = toObjectId(projectId);
  if (!id) return null;
  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let updated: ProjectDocument | null = null;
    await session.withTransaction(async () => {
      const project = await projectCollection(database).findOne(
        { _id: id, ownerId, status: "DRAFT" },
        { session },
      );
      if (!project) return;
      const now = new Date();
      const versionId = new ObjectId();
      const revision = project.revisionCounter + 1;
      const version: ProjectVersionDocument = {
        _id: versionId,
        ownerId,
        projectId: id,
        revision,
        source:
          input.inputMode === "TOPIC"
            ? { inputMode: "TOPIC", topic: input.topic }
            : { inputMode: "SCRIPT", sourceScript: input.sourceScript },
        videoDefaults: input.video,
        contentHash: contentHash(input),
        approval: { status: "DRAFT" },
        createdAt: now,
        schemaVersion: "1",
      };
      await database
        .collection<ProjectVersionDocument>("projectVersions")
        .insertOne(version, { session });
      updated = await projectCollection(database).findOneAndUpdate(
        {
          _id: id,
          ownerId,
          status: "DRAFT",
          currentVersionId: project.currentVersionId,
        },
        {
          $set: {
            title: input.title,
            inputMode: input.inputMode,
            ...(input.inputMode === "TOPIC" ? { topic: input.topic } : {}),
            currentVersionId: versionId,
            videoDefaults: input.video,
            revisionCounter: revision,
            updatedAt: now,
          },
          ...(input.inputMode === "SCRIPT" ? { $unset: { topic: "" } } : {}),
          $inc: { recordVersion: 1 },
        },
        { session, returnDocument: "after" },
      );
      if (!updated)
        throw new Error("The draft changed while it was being saved.");
    });
    return updated ? toSummary(updated) : null;
  } finally {
    await session.endSession();
  }
}

export async function renameProject(
  ownerId: string,
  projectId: string,
  title: string,
): Promise<ProjectSummary | null> {
  const id = toObjectId(projectId);
  const normalizedTitle = title.trim();
  if (!id || !normalizedTitle || normalizedTitle.length > 120) return null;

  const database = await getDatabase();
  const project = await projectCollection(database).findOneAndUpdate(
    { _id: id, ownerId, status: { $ne: "DELETING" } },
    {
      $set: { title: normalizedTitle, updatedAt: new Date() },
      $inc: { recordVersion: 1 },
    },
    { returnDocument: "after" },
  );
  return project ? toSummary(project) : null;
}

export async function setProjectArchived(
  ownerId: string,
  projectId: string,
  archived: boolean,
): Promise<ProjectSummary | null> {
  const id = toObjectId(projectId);
  if (!id) return null;

  const database = await getDatabase();
  const projects = projectCollection(database);
  const existing = await projects.findOne({ _id: id, ownerId });
  if (!existing || existing.status === "DELETING") return null;

  if (archived && existing.status !== "ARCHIVED") {
    const updated = await projects.findOneAndUpdate(
      { _id: id, ownerId, status: existing.status },
      {
        $set: {
          status: "ARCHIVED",
          previousStatus: existing.status,
          archivedAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { recordVersion: 1 },
      },
      { returnDocument: "after" },
    );
    return updated ? toSummary(updated) : null;
  }

  if (!archived && existing.status === "ARCHIVED") {
    const restoredStatus = existing.previousStatus ?? "DRAFT";
    const updated = await projects.findOneAndUpdate(
      { _id: id, ownerId, status: "ARCHIVED" },
      {
        $set: { status: restoredStatus, updatedAt: new Date() },
        $unset: { previousStatus: "", archivedAt: "" },
        $inc: { recordVersion: 1 },
      },
      { returnDocument: "after" },
    );
    return updated ? toSummary(updated) : null;
  }

  return toSummary(existing);
}

export async function deleteDraftProject(
  ownerId: string,
  projectId: string,
): Promise<"deleted" | "not_draft" | "not_found"> {
  const id = toObjectId(projectId);
  if (!id) return "not_found";

  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let result: "deleted" | "not_draft" | "not_found" = "not_found";
    await session.withTransaction(async () => {
      const project = await projectCollection(database).findOne(
        { _id: id, ownerId },
        { session },
      );
      if (!project) return;
      const isDraft =
        project.status === "DRAFT" ||
        (project.status === "ARCHIVED" && project.previousStatus === "DRAFT");
      if (!isDraft) {
        result = "not_draft";
        return;
      }
      await database
        .collection<ProjectVersionDocument>("projectVersions")
        .deleteMany({ projectId: id, ownerId }, { session });
      await projectCollection(database).deleteOne(
        { _id: id, ownerId },
        { session },
      );
      result = "deleted";
    });
    return result;
  } finally {
    await session.endSession();
  }
}
