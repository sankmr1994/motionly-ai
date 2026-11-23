type ProjectMediaIdentity = {
  ownerId: string;
  projectId: string;
  projectTitle: string;
  revision: number;
};

const safeIdentifier = /^[a-zA-Z0-9_-]+$/;

function assertIdentifier(value: string, label: string) {
  if (!safeIdentifier.test(value)) {
    throw new Error(`Invalid ${label} for media storage.`);
  }
}

export function createReadableProjectSlug(title: string) {
  const normalized = title
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return Array.from(normalized || "video")
    .slice(0, 64)
    .join("");
}

export function createProjectMediaPrefix(input: ProjectMediaIdentity) {
  assertIdentifier(input.ownerId, "owner ID");
  assertIdentifier(input.projectId, "project ID");
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
    throw new Error("Invalid revision for media storage.");
  }
  return `users/${input.ownerId}/projects/${createReadableProjectSlug(input.projectTitle)}--${input.projectId}/revision-${input.revision}`;
}

export function createNarrationAssetKey(
  input: ProjectMediaIdentity & { jobId: string; sceneId: string },
) {
  assertIdentifier(input.jobId, "narration job ID");
  assertIdentifier(input.sceneId, "scene ID");
  return `${createProjectMediaPrefix(input)}/narration/${input.jobId}/${input.sceneId}.mp3`;
}

export function createRenderedVideoAssetKey(
  input: ProjectMediaIdentity & { jobId: string },
) {
  assertIdentifier(input.jobId, "render job ID");
  return `${createProjectMediaPrefix(input)}/video/${input.jobId}/motionly-video.mp4`;
}

export function createSceneVisualAssetKey(
  input: ProjectMediaIdentity & {
    versionId: string;
    sceneId: string;
    promptHash: string;
    extension: "png" | "jpg";
  },
) {
  assertIdentifier(input.versionId, "version ID");
  assertIdentifier(input.sceneId, "scene ID");
  if (!/^[a-f0-9]{64}$/u.test(input.promptHash)) {
    throw new Error("Invalid scene visual prompt hash for media storage.");
  }
  return `${createProjectMediaPrefix(input)}/visuals/${input.versionId}/${input.sceneId}-${input.promptHash.slice(0, 20)}.${input.extension}`;
}
