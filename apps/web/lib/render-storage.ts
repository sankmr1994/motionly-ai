import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import {
  deletePrivatePrefix,
  deletePrivateObjects,
  getPrivateObject,
  isR2ObjectKey,
  putPrivateFile,
  putPrivateObject,
  type ByteRange,
} from "./object-storage";

const storageRoot = process.env.VERCEL
  ? resolve(tmpdir(), "motionly-renders")
  : resolve(process.cwd(), "../../storage/renders");
const safeSegment = /^[a-zA-Z0-9_.-]+$/;
const safeJobId = /^[a-zA-Z0-9_-]+$/;

function resolveAsset(assetKey: string) {
  const segments = assetKey.split("/");
  if (
    !segments.length ||
    segments.some((segment) => !segment || !safeSegment.test(segment))
  ) {
    throw new Error("Invalid render asset key.");
  }
  const path = resolve(storageRoot, ...segments);
  if (!path.startsWith(`${storageRoot}${sep}`)) {
    throw new Error("Render asset escaped its storage root.");
  }
  return path;
}

export async function prepareRenderWorkspace(
  jobId: string,
  sceneAudio: Array<{ sceneId: string; audio: Uint8Array }>,
  sceneVisuals: Array<{
    sceneId: string;
    image: Uint8Array;
    fileName: string;
  }>,
  props: unknown,
  identity: {
    ownerId: string;
    projectId: string;
    projectTitle: string;
    revision: number;
  },
) {
  if (!safeJobId.test(jobId)) throw new Error("Invalid render job ID.");
  const publicDir = resolve(storageRoot, jobId, "public");
  const propsPath = resolve(storageRoot, jobId, "render_props_json");
  const outputAssetKey = createRenderedVideoAssetKey({ ...identity, jobId });
  const outputPath = resolve(storageRoot, jobId, "motionly-video.mp4");
  await mkdir(publicDir, { recursive: true });
  await Promise.all([
    ...sceneAudio.map(({ sceneId, audio }) => {
      if (!safeSegment.test(sceneId)) throw new Error("Invalid scene ID.");
      return writeFile(resolve(publicDir, `${sceneId}_audio.mp3`), audio);
    }),
    ...sceneVisuals.map(({ sceneId, image, fileName }) => {
      if (!safeSegment.test(sceneId) || !safeSegment.test(fileName)) {
        throw new Error("Invalid scene visual file name.");
      }
      return writeFile(resolve(publicDir, fileName), image);
    }),
  ]);
  await writeFile(propsPath, JSON.stringify(props), "utf8");
  await mkdir(dirname(outputPath), { recursive: true });
  return { publicDir, propsPath, outputPath, outputAssetKey };
}

export async function getRenderedVideoSize(path: string) {
  return (await stat(path)).size;
}

export async function storeRenderedVideo(
  assetKey: string,
  path: string,
  byteLength: number,
) {
  await putPrivateFile(assetKey, path, byteLength, "video/mp4");
}

export async function storeRenderedVideoBytes(
  assetKey: string,
  video: Uint8Array,
) {
  await putPrivateObject(assetKey, video, "video/mp4");
}

export async function readRenderedVideo(assetKey: string, range?: ByteRange) {
  if (isR2ObjectKey(assetKey, "renders")) {
    return getPrivateObject(assetKey, range);
  }
  if (range) {
    const video = await readFile(resolveAsset(assetKey));
    return video.subarray(range.start, range.end + 1);
  }
  return readFile(resolveAsset(assetKey));
}

export async function cleanupRenderInputs(jobId: string) {
  if (!safeJobId.test(jobId)) return;
  await Promise.all([
    rm(resolve(storageRoot, jobId, "public"), { recursive: true, force: true }),
    rm(resolve(storageRoot, jobId, "render_props_json"), { force: true }),
  ]);
}

export async function deleteRenderJobAssets(
  jobId: string,
  assetKeys: string[] = [],
) {
  if (!safeJobId.test(jobId)) return;
  await Promise.all([
    deletePrivateObjects(assetKeys),
    deletePrivatePrefix(`renders/${jobId}/`),
    rm(resolve(storageRoot, jobId), { recursive: true, force: true }),
  ]);
}

export async function cleanupRenderWorkspace(jobId: string) {
  if (!safeJobId.test(jobId)) return;
  await rm(resolve(storageRoot, jobId), { recursive: true, force: true });
}
import { createRenderedVideoAssetKey } from "@motionly/shared";
