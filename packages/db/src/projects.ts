import type {
  CreateProjectRequest,
  ProjectInputMode,
  ProjectStatus,
  VideoDefaults,
} from "@motionly/shared";
import { createHash } from "node:crypto";
import { ObjectId, type ClientSession, type Collection } from "mongodb";
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
  createdAt: string;
  updatedAt: string;
};

export function buildOwnedProjectsFilter(ownerId: string) {
  const normalizedOwnerId = ownerId.trim();
  if (!normalizedOwnerId) throw new Error("A project owner is required.");
  return {
    ownerId: normalizedOwnerId,
    status: { $ne: "DELETING" as const },
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
): Promise<ProjectSummary[]> {
  const database = await getDatabase();
  const projects = await projectCollection(database)
    .find(buildOwnedProjectsFilter(ownerId))
    .sort({ updatedAt: -1, _id: -1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .toArray();
  return projects.map(toSummary);
}
