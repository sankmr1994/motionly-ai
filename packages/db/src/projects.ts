import type {
  AnimationAction,
  CreateProjectRequest,
  EditProjectStoryboardRequest,
  ProjectInputMode,
  ProjectReference,
  ProjectStatus,
  Storyboard,
  VideoDefaults,
} from "@motionly/shared";
import { getNarrationTimingIssues, storyboardSchema } from "@motionly/shared";
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

type ProjectSource = {
  inputMode: ProjectInputMode;
  topic?: string;
  sourceScript?: string;
  references?: ProjectReference[];
};

type StoryboardEditPatch = {
  sceneId: string;
  title?: string;
  narration?: string;
  objects?: string[];
};

type ProjectVersionDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  revision: number;
  basedOnVersionId?: ObjectId;
  source: ProjectSource;
  videoDefaults: VideoDefaults;
  script?: string;
  storyboard?: Storyboard;
  templateRegistryVersion?: string;
  planningProvenance?: {
    provider: "GOOGLE_GEMINI";
    model: string;
    sdkVersion: string;
    generatedAt: Date;
    usedFallback: false;
  };
  validation?: {
    valid: true;
    warnings: string[];
    totalFrames: number;
  };
  editingProvenance?: {
    editedBy: string;
    editedAt: Date;
  };
  contentHash: string;
  approval: {
    status: "DRAFT" | "REVIEW_READY" | "APPROVED";
    approvedBy?: string;
    approvedAt?: Date;
    approvedContentHash?: string;
  };
  createdAt: Date;
  schemaVersion: "1";
};

type PlanningJobDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  sourceVersionId: ObjectId;
  referenceOverride?: ProjectReference[];
  editPatches?: StoryboardEditPatch[];
  previousProjectStatus: "DRAFT" | "REVIEW_READY";
  status: "GENERATING" | "COMPLETED" | "FAILED";
  progress: number;
  attempt: number;
  inputHash: string;
  outputVersionId?: ObjectId;
  provider?: {
    name: "GOOGLE_GEMINI";
    model: string;
  };
  error?: {
    code: "PLANNING_FAILED";
    safeMessage: string;
    retryable: boolean;
    occurredAt: Date;
  };
  createdAt: Date;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
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
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDraft = ProjectSummary & {
  content: string;
  references: ProjectReference[];
};

export type ProjectPlan = {
  project: ProjectSummary;
  versionId: string;
  revision: number;
  nextRevision: number;
  script: string;
  storyboard: Storyboard;
  contentHash: string;
  approvalStatus: "REVIEW_READY" | "APPROVED";
  isCurrent: boolean;
  references: ProjectReference[];
  generatedBy: {
    provider: "GOOGLE_GEMINI";
    model: string;
    generatedAt: string;
  };
};

export type ProjectStoryboardRevision = {
  versionId: string;
  revision: number;
  approvalStatus: "REVIEW_READY" | "APPROVED";
  sceneCount: number;
  durationSeconds: number;
  model: string;
  createdAt: string;
  isCurrent: boolean;
};

export type PlanningInput = {
  jobId: string;
  projectId: string;
  sourceVersionId: string;
  inputMode: ProjectInputMode;
  content: string;
  references: ProjectReference[];
  video: VideoDefaults;
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

export function getPlanningReadiness(status: ProjectStatus) {
  if (status === "PLANNING") return "already_planning" as const;
  if (status === "DRAFT" || status === "REVIEW_READY") {
    return "ready" as const;
  }
  return "not_ready" as const;
}

export function resolvePlanningReferences(
  current: ProjectReference[] = [],
  override?: ProjectReference[],
) {
  const references = override ?? current;
  return {
    references,
    changed:
      override !== undefined &&
      JSON.stringify(override) !== JSON.stringify(current),
  };
}

export function getRevisionSelectionReadiness(
  status: ProjectStatus,
  isCurrentVersion: boolean,
) {
  if (status === "PLANNING") return "busy" as const;
  if (status !== "REVIEW_READY") return "not_ready" as const;
  if (isCurrentVersion) return "current" as const;
  return "ready" as const;
}

function remapAnimationActionTargets(
  action: AnimationAction,
  objectRenames: Map<string, string>,
): AnimationAction {
  const rename = (value: string) => objectRenames.get(value) ?? value;
  switch (action.type) {
    case "SHOW":
    case "LABEL":
      return { ...action, targets: action.targets.map(rename) };
    case "MOVE":
      return {
        ...action,
        target: rename(action.target),
        to: rename(action.to),
      };
    case "HIGHLIGHT":
    case "DRAW":
    case "ZOOM":
      return { ...action, target: rename(action.target) };
  }
}

export function compileStoryboardEdits(
  storyboard: Storyboard,
  edits: EditProjectStoryboardRequest["scenes"],
):
  | {
      ok: true;
      storyboard: Storyboard;
      script: string;
      changedScenes: number;
      titleChanges: number;
      narrationChanges: number;
      visualLabelChanges: number;
    }
  | {
      ok: false;
      reason: "scene_mismatch" | "timing" | "visual_mismatch";
      message: string;
    } {
  const editsById = new Map(edits.map((scene) => [scene.id, scene]));
  if (
    editsById.size !== storyboard.scenes.length ||
    storyboard.scenes.some((scene) => !editsById.has(scene.id))
  ) {
    return {
      ok: false,
      reason: "scene_mismatch",
      message: "Every current storyboard scene must be included exactly once.",
    };
  }

  let titleChanges = 0;
  let narrationChanges = 0;
  let visualLabelChanges = 0;
  const narrationChangedIds = new Set<string>();
  for (const scene of storyboard.scenes) {
    const edit = editsById.get(scene.id)!;
    if (edit.objects.length !== scene.objects.length) {
      return {
        ok: false,
        reason: "visual_mismatch",
        message: `${scene.id} must keep its existing number of visual labels.`,
      };
    }
    const objects = edit.objects.map((object) => object.trim());
    const objectChanged = objects.some(
      (object, objectIndex) => object !== scene.objects[objectIndex],
    );
    if (objectChanged) {
      const normalizedObjects = objects.map((object) => object.toLowerCase());
      if (new Set(normalizedObjects).size !== normalizedObjects.length) {
        return {
          ok: false,
          reason: "visual_mismatch",
          message: `${scene.id} visual labels must be unique.`,
        };
      }
      const replacementsByOriginal = new Map<string, string>();
      for (const [objectIndex, object] of scene.objects.entries()) {
        const replacement = objects[objectIndex]!;
        const existingReplacement = replacementsByOriginal.get(object);
        if (existingReplacement && existingReplacement !== replacement) {
          return {
            ok: false,
            reason: "visual_mismatch",
            message: `${scene.id} contains duplicate labels that cannot be renamed differently.`,
          };
        }
        replacementsByOriginal.set(object, replacement);
      }
    }
  }
  const nextStoryboard = storyboardSchema.parse({
    ...storyboard,
    scenes: storyboard.scenes.map((scene, index) => {
      const edit = editsById.get(scene.id)!;
      const title = edit.title.trim();
      const narration = edit.narration.trim();
      const titleChanged = (scene.title ?? `Scene ${index + 1}`) !== title;
      if (titleChanged) titleChanges += 1;
      if (scene.narration !== narration) {
        narrationChanges += 1;
        narrationChangedIds.add(scene.id);
      }
      const objects = edit.objects.map((object) => object.trim());
      const objectChanged = objects.some(
        (object, objectIndex) => object !== scene.objects[objectIndex],
      );
      const objectRenames = new Map<string, string>();
      if (objectChanged) {
        scene.objects.forEach((object, objectIndex) => {
          const replacement = objects[objectIndex]!;
          objectRenames.set(object, replacement);
          if (object !== replacement) visualLabelChanges += 1;
        });
      }
      return {
        ...scene,
        ...(scene.title !== undefined || titleChanged ? { title } : {}),
        narration,
        objects,
        actions: objectChanged
          ? scene.actions.map((action) =>
              remapAnimationActionTargets(action, objectRenames),
            )
          : scene.actions,
      };
    }),
  });
  const timingIssues = getNarrationTimingIssues(nextStoryboard).filter(
    (issue) => narrationChangedIds.has(issue.sceneId),
  );
  if (timingIssues.length) {
    const first = timingIssues[0]!;
    return {
      ok: false,
      reason: "timing",
      message: `${first.sceneId} has ${first.wordCount} narration words; its limit is ${first.maximumWords}.`,
    };
  }
  return {
    ok: true,
    storyboard: nextStoryboard,
    script: nextStoryboard.scenes.map((scene) => scene.narration).join("\n\n"),
    changedScenes: new Set(
      nextStoryboard.scenes
        .filter((scene, index) => {
          const original = storyboard.scenes[index]!;
          return (
            (original.title ?? `Scene ${index + 1}`) !==
              (scene.title ?? `Scene ${index + 1}`) ||
            original.narration !== scene.narration ||
            original.objects.some(
              (object, objectIndex) => object !== scene.objects[objectIndex],
            )
          );
        })
        .map((scene) => scene.id),
    ).size,
    titleChanges,
    narrationChanges,
    visualLabelChanges,
  };
}

export function deriveStoryboardEditPatches(
  storyboard: Storyboard,
  edits: EditProjectStoryboardRequest["scenes"],
):
  | { ok: true; patches: StoryboardEditPatch[] }
  | { ok: false; message: string } {
  const compiled = compileStoryboardEdits(storyboard, edits);
  if (!compiled.ok) return { ok: false, message: compiled.message };
  const editsById = new Map(edits.map((scene) => [scene.id, scene]));
  const patches = storyboard.scenes.flatMap((scene, index) => {
    const edit = editsById.get(scene.id)!;
    const patch: StoryboardEditPatch = { sceneId: scene.id };
    const originalTitle = scene.title ?? `Scene ${index + 1}`;
    if (edit.title.trim() !== originalTitle) patch.title = edit.title.trim();
    if (edit.narration.trim() !== scene.narration) {
      patch.narration = edit.narration.trim();
    }
    if (
      edit.objects.some(
        (object, objectIndex) => object.trim() !== scene.objects[objectIndex],
      )
    ) {
      patch.objects = edit.objects.map((object) => object.trim());
    }
    return Object.keys(patch).length > 1 ? [patch] : [];
  });
  return { ok: true, patches };
}

export function applyStoryboardEditPatches(
  storyboard: Storyboard,
  patches: StoryboardEditPatch[],
) {
  if (!patches.length) {
    return {
      ok: true as const,
      storyboard,
      script: storyboard.scenes.map((scene) => scene.narration).join("\n\n"),
    };
  }
  const patchesById = new Map(patches.map((patch) => [patch.sceneId, patch]));
  const compiled = compileStoryboardEdits(
    storyboard,
    storyboard.scenes.map((scene, index) => {
      const patch = patchesById.get(scene.id);
      return {
        id: scene.id,
        title: patch?.title ?? scene.title ?? `Scene ${index + 1}`,
        narration: patch?.narration ?? scene.narration,
        objects: patch?.objects ?? scene.objects,
      };
    }),
  );
  if (!compiled.ok) return compiled;
  return {
    ok: true as const,
    storyboard: compiled.storyboard,
    script: compiled.script,
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
    canDelete:
      project.status === "DRAFT" ||
      (project.status === "ARCHIVED" && project.previousStatus === "DRAFT"),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function contentHash(input: CreateProjectRequest): string {
  return hashValue(JSON.stringify(sourceFromInput(input)));
}

function hashValue(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function sourceFromInput(input: CreateProjectRequest): ProjectSource {
  return {
    ...(input.inputMode === "TOPIC"
      ? { inputMode: "TOPIC" as const, topic: input.topic }
      : { inputMode: "SCRIPT" as const, sourceScript: input.sourceScript }),
    ...(input.references?.length
      ? { references: input.references.map(({ url }) => ({ url })) }
      : {}),
  };
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
    source: sourceFromInput(input),
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
  return {
    ...toSummary(project),
    content,
    references: version.source.references ?? [],
  };
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
        source: sourceFromInput(input),
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
  if (
    !existing ||
    existing.status === "DELETING" ||
    existing.status === "PLANNING"
  ) {
    return null;
  }

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

export async function beginProjectPlanning(
  ownerId: string,
  projectId: string,
  options: {
    referenceOverride?: ProjectReference[];
    expectedVersionId?: string;
    storyboardEdits?: EditProjectStoryboardRequest;
  } = {},
): Promise<
  | { ok: true; input: PlanningInput }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_ready"
        | "already_planning"
        | "conflict"
        | "no_changes"
        | "invalid_edits";
    }
> {
  const id = toObjectId(projectId);
  if (!id) return { ok: false, reason: "not_found" };
  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let outcome:
      | { ok: true; input: PlanningInput }
      | {
          ok: false;
          reason:
            | "not_found"
            | "not_ready"
            | "already_planning"
            | "conflict"
            | "no_changes"
            | "invalid_edits";
        } = { ok: false, reason: "not_found" };
    await session.withTransaction(async () => {
      const project = await projectCollection(database).findOne(
        { _id: id, ownerId },
        { session },
      );
      if (!project) return;
      if (
        options.expectedVersionId &&
        project.currentVersionId.toHexString() !== options.expectedVersionId
      ) {
        outcome = { ok: false, reason: "conflict" };
        return;
      }
      if (project.status === "PLANNING") {
        const interruptedJob = await database
          .collection<PlanningJobDocument>("planningJobs")
          .findOne(
            { projectId: id, ownerId, status: "GENERATING" },
            { session, sort: { updatedAt: -1 } },
          );
        const staleBefore = Date.now() - 60 * 1_000;
        if (
          !interruptedJob ||
          interruptedJob.updatedAt.getTime() > staleBefore
        ) {
          outcome = { ok: false, reason: "already_planning" };
          return;
        }

        const recoveredAt = new Date();
        await database
          .collection<PlanningJobDocument>("planningJobs")
          .updateOne(
            { _id: interruptedJob._id, ownerId, status: "GENERATING" },
            {
              $set: {
                status: "FAILED",
                progress: 100,
                error: {
                  code: "PLANNING_FAILED",
                  safeMessage:
                    "The previous planning attempt was interrupted. Please retry.",
                  retryable: true,
                  occurredAt: recoveredAt,
                },
                updatedAt: recoveredAt,
                completedAt: recoveredAt,
              },
            },
            { session },
          );
        await projectCollection(database).updateOne(
          { _id: id, ownerId, status: "PLANNING" },
          {
            $set: {
              status: interruptedJob.previousProjectStatus,
              updatedAt: recoveredAt,
            },
            $inc: { recordVersion: 1 },
          },
          { session },
        );
        project.status = interruptedJob.previousProjectStatus;
        project.updatedAt = recoveredAt;
      }
      const readiness = getPlanningReadiness(project.status);
      if (readiness === "already_planning") {
        outcome = { ok: false, reason: "already_planning" };
        return;
      }
      if (
        readiness === "not_ready" ||
        (project.status !== "DRAFT" && project.status !== "REVIEW_READY")
      ) {
        outcome = { ok: false, reason: "not_ready" };
        return;
      }
      const previousProjectStatus = project.status;
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
      if (!version) return;
      let editPatches: StoryboardEditPatch[] = [];
      if (options.storyboardEdits) {
        if (
          options.storyboardEdits.basedOnVersionId !==
            project.currentVersionId.toHexString() ||
          options.storyboardEdits.expectedContentHash !== version.contentHash ||
          !version.storyboard
        ) {
          outcome = { ok: false, reason: "conflict" };
          return;
        }
        const parsedStoryboard = storyboardSchema.safeParse(version.storyboard);
        if (!parsedStoryboard.success) {
          outcome = { ok: false, reason: "conflict" };
          return;
        }
        const patchResult = deriveStoryboardEditPatches(
          parsedStoryboard.data,
          options.storyboardEdits.scenes,
        );
        if (!patchResult.ok) {
          outcome = { ok: false, reason: "invalid_edits" };
          return;
        }
        editPatches = patchResult.patches;
      }
      const referenceDecision = resolvePlanningReferences(
        version.source.references,
        options.referenceOverride,
      );
      const references = referenceDecision.references;
      if (
        options.referenceOverride !== undefined &&
        !referenceDecision.changed &&
        !editPatches.length
      ) {
        outcome = { ok: false, reason: "no_changes" };
        return;
      }
      const content =
        version.source.inputMode === "TOPIC"
          ? (version.source.topic ?? "")
          : (version.source.sourceScript ?? "");
      if (!content) return;
      const now = new Date();
      const jobId = new ObjectId();
      const update = await projectCollection(database).updateOne(
        {
          _id: id,
          ownerId,
          status: project.status,
          currentVersionId: project.currentVersionId,
        },
        {
          $set: { status: "PLANNING", updatedAt: now },
          $inc: { recordVersion: 1 },
        },
        { session },
      );
      if (!update.modifiedCount) {
        outcome = { ok: false, reason: "already_planning" };
        return;
      }
      await database.collection<PlanningJobDocument>("planningJobs").insertOne(
        {
          _id: jobId,
          ownerId,
          projectId: id,
          sourceVersionId: project.currentVersionId,
          ...(options.referenceOverride !== undefined
            ? { referenceOverride: options.referenceOverride }
            : {}),
          ...(editPatches.length ? { editPatches } : {}),
          previousProjectStatus,
          status: "GENERATING",
          progress: 20,
          attempt: 1,
          inputHash: hashValue(
            JSON.stringify({
              sourceVersionId: project.currentVersionId.toHexString(),
              content,
              references,
              editPatches,
              video: version.videoDefaults,
            }),
          ),
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
          sourceVersionId: project.currentVersionId.toHexString(),
          inputMode: version.source.inputMode,
          content,
          references,
          video: version.videoDefaults,
        },
      };
    });
    return outcome;
  } finally {
    await session.endSession();
  }
}

export async function failProjectPlanning(
  ownerId: string,
  jobId: string,
): Promise<void> {
  const id = toObjectId(jobId);
  if (!id) return;
  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const job = await database
        .collection<PlanningJobDocument>("planningJobs")
        .findOne({ _id: id, ownerId, status: "GENERATING" }, { session });
      if (!job) return;
      const now = new Date();
      await database.collection<PlanningJobDocument>("planningJobs").updateOne(
        { _id: id, ownerId, status: "GENERATING" },
        {
          $set: {
            status: "FAILED",
            progress: 100,
            error: {
              code: "PLANNING_FAILED",
              safeMessage:
                "We could not create this storyboard. Please try again.",
              retryable: true,
              occurredAt: now,
            },
            updatedAt: now,
            completedAt: now,
          },
        },
        { session },
      );
      await projectCollection(database).updateOne(
        {
          _id: job.projectId,
          ownerId,
          status: "PLANNING",
          currentVersionId: job.sourceVersionId,
        },
        {
          $set: { status: job.previousProjectStatus, updatedAt: now },
          $inc: { recordVersion: 1 },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}

export async function completeProjectPlanning(
  ownerId: string,
  jobId: string,
  generated: {
    storyboard: Storyboard;
    provider: "GOOGLE_GEMINI";
    model: string;
    generatedAt: string;
  },
): Promise<ProjectPlan> {
  const id = toObjectId(jobId);
  if (!id) throw new Error("Planning job was not found.");
  const storyboard = storyboardSchema.parse(generated.storyboard);
  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let completed: ProjectPlan | undefined;
    await session.withTransaction(async () => {
      const job = await database
        .collection<PlanningJobDocument>("planningJobs")
        .findOne({ _id: id, ownerId, status: "GENERATING" }, { session });
      if (!job) throw new Error("Planning job is no longer active.");
      const project = await projectCollection(database).findOne(
        {
          _id: job.projectId,
          ownerId,
          status: "PLANNING",
          currentVersionId: job.sourceVersionId,
        },
        { session },
      );
      if (!project) throw new Error("Project changed while planning.");
      const sourceVersion = await database
        .collection<ProjectVersionDocument>("projectVersions")
        .findOne(
          { _id: job.sourceVersionId, projectId: job.projectId, ownerId },
          { session },
        );
      if (!sourceVersion) throw new Error("Source version was not found.");
      const plannedSource: ProjectSource =
        job.referenceOverride !== undefined
          ? {
              ...sourceVersion.source,
              references: job.referenceOverride,
            }
          : sourceVersion.source;
      const editedCandidate = applyStoryboardEditPatches(
        storyboard,
        job.editPatches ?? [],
      );
      if (!editedCandidate.ok) {
        throw new Error(
          `Combined storyboard edits failed: ${editedCandidate.message}`,
        );
      }
      const finalStoryboard = editedCandidate.storyboard;
      const now = new Date();
      const versionId = new ObjectId();
      const revision = project.revisionCounter + 1;
      const script = editedCandidate.script;
      const plannedHash = hashValue(
        JSON.stringify({
          source: plannedSource,
          script,
          storyboard: finalStoryboard,
          videoDefaults: sourceVersion.videoDefaults,
        }),
      );
      const version: ProjectVersionDocument = {
        _id: versionId,
        ownerId,
        projectId: job.projectId,
        revision,
        basedOnVersionId: job.sourceVersionId,
        source: plannedSource,
        videoDefaults: sourceVersion.videoDefaults,
        script,
        storyboard: finalStoryboard,
        templateRegistryVersion: "2026-11-09.1",
        planningProvenance: {
          provider: generated.provider,
          model: generated.model,
          sdkVersion: "2.32.0",
          generatedAt: new Date(generated.generatedAt),
          usedFallback: false,
        },
        ...(job.editPatches?.length
          ? { editingProvenance: { editedBy: ownerId, editedAt: now } }
          : {}),
        validation: {
          valid: true,
          warnings: [],
          totalFrames:
            finalStoryboard.video.targetDurationSeconds *
            finalStoryboard.video.fps,
        },
        contentHash: plannedHash,
        approval: { status: "REVIEW_READY" },
        createdAt: now,
        schemaVersion: "1",
      };
      await database
        .collection<ProjectVersionDocument>("projectVersions")
        .insertOne(version, { session });
      const projectUpdate = await projectCollection(database).findOneAndUpdate(
        {
          _id: job.projectId,
          ownerId,
          status: "PLANNING",
          currentVersionId: job.sourceVersionId,
        },
        {
          $set: {
            status: "REVIEW_READY",
            currentVersionId: versionId,
            revisionCounter: revision,
            updatedAt: now,
          },
          $inc: { recordVersion: 1 },
        },
        { session, returnDocument: "after" },
      );
      if (!projectUpdate) throw new Error("Project changed while planning.");
      await database.collection<PlanningJobDocument>("planningJobs").updateOne(
        { _id: id, ownerId, status: "GENERATING" },
        {
          $set: {
            status: "COMPLETED",
            progress: 100,
            outputVersionId: versionId,
            provider: { name: generated.provider, model: generated.model },
            updatedAt: now,
            completedAt: now,
          },
        },
        { session },
      );
      completed = {
        project: toSummary(projectUpdate),
        versionId: versionId.toHexString(),
        revision,
        nextRevision: revision + 1,
        script,
        storyboard: finalStoryboard,
        contentHash: plannedHash,
        approvalStatus: "REVIEW_READY",
        isCurrent: true,
        references: plannedSource.references ?? [],
        generatedBy: {
          provider: generated.provider,
          model: generated.model,
          generatedAt: generated.generatedAt,
        },
      };
    });
    if (!completed) throw new Error("Planning did not complete.");
    return completed;
  } finally {
    await session.endSession();
  }
}

export async function getProjectPlan(
  ownerId: string,
  projectId: string,
): Promise<ProjectPlan | null> {
  const id = toObjectId(projectId);
  if (!id) return null;
  const database = await getDatabase();
  const project = await projectCollection(database).findOne({
    _id: id,
    ownerId,
    status: { $in: ["REVIEW_READY", "APPROVED"] },
  });
  if (!project) return null;
  const version = await database
    .collection<ProjectVersionDocument>("projectVersions")
    .findOne({ _id: project.currentVersionId, projectId: id, ownerId });
  if (!version?.storyboard || !version.script || !version.planningProvenance) {
    return null;
  }
  const parsed = storyboardSchema.safeParse(version.storyboard);
  if (!parsed.success) return null;
  return {
    project: toSummary(project),
    versionId: version._id.toHexString(),
    revision: version.revision,
    nextRevision: project.revisionCounter + 1,
    script: version.script,
    storyboard: parsed.data,
    contentHash: version.contentHash,
    approvalStatus:
      version.approval.status === "APPROVED" ? "APPROVED" : "REVIEW_READY",
    isCurrent: project.currentVersionId.equals(version._id),
    references: version.source.references ?? [],
    generatedBy: {
      provider: version.planningProvenance.provider,
      model: version.planningProvenance.model,
      generatedAt: version.planningProvenance.generatedAt.toISOString(),
    },
  };
}

export async function listProjectStoryboardRevisions(
  ownerId: string,
  projectId: string,
): Promise<ProjectStoryboardRevision[]> {
  const id = toObjectId(projectId);
  if (!id) return [];
  const database = await getDatabase();
  const project = await projectCollection(database).findOne({
    _id: id,
    ownerId,
    status: { $in: ["REVIEW_READY", "APPROVED"] },
  });
  if (!project) return [];
  const versions = await database
    .collection<ProjectVersionDocument>("projectVersions")
    .find({
      projectId: id,
      ownerId,
      storyboard: { $exists: true },
      planningProvenance: { $exists: true },
    })
    .sort({ revision: -1 })
    .limit(50)
    .toArray();
  return versions.flatMap((version) => {
    if (!version.storyboard || !version.planningProvenance) return [];
    const parsed = storyboardSchema.safeParse(version.storyboard);
    if (!parsed.success) return [];
    const durationSeconds = parsed.data.scenes.reduce(
      (total, scene) => total + scene.durationEstimateSeconds,
      0,
    );
    return [
      {
        versionId: version._id.toHexString(),
        revision: version.revision,
        approvalStatus:
          version.approval.status === "APPROVED"
            ? ("APPROVED" as const)
            : ("REVIEW_READY" as const),
        sceneCount: parsed.data.scenes.length,
        durationSeconds,
        model: version.planningProvenance.model,
        createdAt: version.createdAt.toISOString(),
        isCurrent: project.currentVersionId.equals(version._id),
      },
    ];
  });
}

export async function makeProjectStoryboardRevisionCurrent(
  ownerId: string,
  projectId: string,
  versionId: string,
): Promise<"selected" | "not_found" | "not_ready" | "current" | "conflict"> {
  const id = toObjectId(projectId);
  const sourceVersionId = toObjectId(versionId);
  if (!id || !sourceVersionId) return "not_found";
  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let result:
      "selected" | "not_found" | "not_ready" | "current" | "conflict" =
      "not_found";
    await session.withTransaction(async () => {
      const project = await projectCollection(database).findOne(
        { _id: id, ownerId },
        { session },
      );
      if (!project) return;
      const readiness = getRevisionSelectionReadiness(
        project.status,
        project.currentVersionId.equals(sourceVersionId),
      );
      if (readiness !== "ready") {
        result = readiness === "current" ? "current" : "not_ready";
        return;
      }
      const sourceVersion = await database
        .collection<ProjectVersionDocument>("projectVersions")
        .findOne(
          {
            _id: sourceVersionId,
            projectId: id,
            ownerId,
            storyboard: { $exists: true },
            script: { $exists: true },
            planningProvenance: { $exists: true },
            "approval.status": "REVIEW_READY",
          },
          { session },
        );
      if (
        !sourceVersion?.storyboard ||
        !sourceVersion.script ||
        !sourceVersion.planningProvenance ||
        !storyboardSchema.safeParse(sourceVersion.storyboard).success
      ) {
        return;
      }
      const projectUpdate = await projectCollection(database).updateOne(
        {
          _id: id,
          ownerId,
          status: "REVIEW_READY",
          currentVersionId: project.currentVersionId,
          revisionCounter: project.revisionCounter,
        },
        {
          $set: { currentVersionId: sourceVersionId, updatedAt: new Date() },
          $inc: { recordVersion: 1 },
        },
        { session },
      );
      result = projectUpdate.modifiedCount ? "selected" : "conflict";
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export type EditProjectStoryboardResult =
  | { ok: true; versionId: string; revision: number }
  | {
      ok: false;
      reason:
        "not_found" | "not_ready" | "conflict" | "no_changes" | "invalid_edits";
      message?: string;
    };

export async function createEditedProjectStoryboardRevision(
  ownerId: string,
  projectId: string,
  input: EditProjectStoryboardRequest,
): Promise<EditProjectStoryboardResult> {
  const id = toObjectId(projectId);
  const basedOnVersionId = toObjectId(input.basedOnVersionId);
  if (!id || !basedOnVersionId) {
    return { ok: false, reason: "not_found" };
  }
  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let result: EditProjectStoryboardResult = {
      ok: false,
      reason: "not_found",
    };
    await session.withTransaction(async () => {
      const project = await projectCollection(database).findOne(
        { _id: id, ownerId },
        { session },
      );
      if (!project) return;
      if (
        project.status !== "REVIEW_READY" ||
        !project.currentVersionId.equals(basedOnVersionId)
      ) {
        result = { ok: false, reason: "not_ready" };
        return;
      }
      const sourceVersion = await database
        .collection<ProjectVersionDocument>("projectVersions")
        .findOne(
          {
            _id: basedOnVersionId,
            projectId: id,
            ownerId,
            contentHash: input.expectedContentHash,
            "approval.status": "REVIEW_READY",
          },
          { session },
        );
      if (
        !sourceVersion?.storyboard ||
        !sourceVersion.script ||
        !sourceVersion.planningProvenance
      ) {
        result = { ok: false, reason: "conflict" };
        return;
      }
      const parsedSource = storyboardSchema.safeParse(sourceVersion.storyboard);
      if (!parsedSource.success) {
        result = { ok: false, reason: "conflict" };
        return;
      }
      const compiled = compileStoryboardEdits(parsedSource.data, input.scenes);
      if (!compiled.ok) {
        result = {
          ok: false,
          reason: "invalid_edits",
          message: compiled.message,
        };
        return;
      }
      if (!compiled.changedScenes) {
        result = { ok: false, reason: "no_changes" };
        return;
      }

      const now = new Date();
      const versionId = new ObjectId();
      const revision = project.revisionCounter + 1;
      const editedHash = hashValue(
        JSON.stringify({
          source: sourceVersion.source,
          script: compiled.script,
          storyboard: compiled.storyboard,
          videoDefaults: sourceVersion.videoDefaults,
        }),
      );
      const projectUpdate = await projectCollection(database).updateOne(
        {
          _id: id,
          ownerId,
          status: "REVIEW_READY",
          currentVersionId: basedOnVersionId,
          revisionCounter: project.revisionCounter,
        },
        {
          $set: {
            currentVersionId: versionId,
            revisionCounter: revision,
            updatedAt: now,
          },
          $inc: { recordVersion: 1 },
        },
        { session },
      );
      if (!projectUpdate.modifiedCount) {
        result = { ok: false, reason: "conflict" };
        return;
      }
      await database
        .collection<ProjectVersionDocument>("projectVersions")
        .insertOne(
          {
            _id: versionId,
            ownerId,
            projectId: id,
            revision,
            basedOnVersionId,
            source: sourceVersion.source,
            videoDefaults: sourceVersion.videoDefaults,
            script: compiled.script,
            storyboard: compiled.storyboard,
            templateRegistryVersion: sourceVersion.templateRegistryVersion,
            planningProvenance: sourceVersion.planningProvenance,
            editingProvenance: { editedBy: ownerId, editedAt: now },
            validation: {
              valid: true,
              warnings: sourceVersion.validation?.warnings ?? [],
              totalFrames:
                compiled.storyboard.video.targetDurationSeconds *
                compiled.storyboard.video.fps,
            },
            contentHash: editedHash,
            approval: { status: "REVIEW_READY" },
            createdAt: now,
            schemaVersion: "1",
          },
          { session },
        );
      result = {
        ok: true,
        versionId: versionId.toHexString(),
        revision,
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function approveProjectPlan(
  ownerId: string,
  projectId: string,
  versionId: string,
  expectedContentHash: string,
): Promise<"approved" | "not_found" | "conflict"> {
  const id = toObjectId(projectId);
  const versionObjectId = toObjectId(versionId);
  if (!id || !versionObjectId) return "not_found";
  const database = await getDatabase();
  const client = getDatabaseClient();
  const session = client.startSession();
  try {
    let result: "approved" | "not_found" | "conflict" = "not_found";
    await session.withTransaction(async () => {
      const project = await projectCollection(database).findOne(
        { _id: id, ownerId },
        { session },
      );
      if (!project) return;
      if (
        project.status !== "REVIEW_READY" ||
        !project.currentVersionId.equals(versionObjectId)
      ) {
        result = "conflict";
        return;
      }
      const version = await database
        .collection<ProjectVersionDocument>("projectVersions")
        .findOne(
          {
            _id: versionObjectId,
            projectId: id,
            ownerId,
            "approval.status": "REVIEW_READY",
            contentHash: expectedContentHash,
          },
          { session },
        );
      if (!version) {
        result = "conflict";
        return;
      }
      const now = new Date();
      const versionUpdate = await database
        .collection<ProjectVersionDocument>("projectVersions")
        .updateOne(
          {
            _id: versionObjectId,
            projectId: id,
            ownerId,
            "approval.status": "REVIEW_READY",
            contentHash: expectedContentHash,
          },
          {
            $set: {
              approval: {
                status: "APPROVED",
                approvedBy: ownerId,
                approvedAt: now,
                approvedContentHash: version.contentHash,
              },
            },
          },
          { session },
        );
      if (!versionUpdate.modifiedCount) {
        result = "conflict";
        return;
      }
      const projectUpdate = await projectCollection(database).updateOne(
        {
          _id: id,
          ownerId,
          status: "REVIEW_READY",
          currentVersionId: versionObjectId,
        },
        {
          $set: { status: "APPROVED", updatedAt: now },
          $inc: { recordVersion: 1 },
        },
        { session },
      );
      if (!projectUpdate.modifiedCount) {
        throw new Error("Project changed while approving the plan.");
      }
      result = "approved";
    });
    return result;
  } finally {
    await session.endSession();
  }
}
