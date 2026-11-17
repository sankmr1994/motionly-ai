import { readFile, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import {
  deletePrivatePrefix,
  deletePrivateObjects,
  getPrivateObject,
  isR2ObjectKey,
  putPrivateObject,
  type ByteRange,
} from "./object-storage";

const storageRoot = resolve(process.cwd(), "../../storage/narrations");
const safeSegment = /^[a-zA-Z0-9_-]+$/;

function resolveAsset(assetKey: string) {
  const segments = assetKey.split("/");
  if (
    !segments.length ||
    segments.some((segment) => !segment || !safeSegment.test(segment))
  ) {
    throw new Error("Invalid narration asset key.");
  }
  const path = resolve(storageRoot, ...segments);
  if (!path.startsWith(`${storageRoot}${sep}`)) {
    throw new Error("Narration asset escaped its storage root.");
  }
  return path;
}

export async function storeNarrationAudio(
  identity: {
    ownerId: string;
    projectId: string;
    projectTitle: string;
    revision: number;
    jobId: string;
    sceneId: string;
  },
  audio: Uint8Array,
) {
  const assetKey = createNarrationAssetKey(identity);
  await putPrivateObject(assetKey, audio, "audio/mpeg");
  return { assetKey, byteLength: audio.byteLength };
}

export async function readNarrationAudio(assetKey: string, range?: ByteRange) {
  if (isR2ObjectKey(assetKey, "narrations")) {
    return getPrivateObject(assetKey, range);
  }
  if (range) {
    const audio = await readFile(resolveAsset(assetKey));
    return audio.subarray(range.start, range.end + 1);
  }
  return readFile(resolveAsset(assetKey));
}

export async function deleteNarrationJobAssets(
  jobId: string,
  assetKeys: string[] = [],
) {
  if (!safeSegment.test(jobId)) return;
  await Promise.all([
    deletePrivateObjects(assetKeys),
    deletePrivatePrefix(`narrations/${jobId}/`),
    rm(resolve(storageRoot, jobId), { recursive: true, force: true }),
  ]);
}
import { createNarrationAssetKey } from "@motionly/shared";
