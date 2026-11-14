import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

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
  jobId: string,
  sceneId: string,
  audio: Uint8Array,
) {
  const assetKey = `${jobId}/${sceneId}_narration_mp3`;
  const path = resolveAsset(assetKey);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, audio);
  return { assetKey, byteLength: audio.byteLength };
}

export async function readNarrationAudio(assetKey: string) {
  return readFile(resolveAsset(assetKey));
}

export async function deleteNarrationJobAssets(jobId: string) {
  if (!safeSegment.test(jobId)) return;
  await rm(resolve(storageRoot, jobId), { recursive: true, force: true });
}
