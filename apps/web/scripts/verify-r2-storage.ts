import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createRenderedVideoAssetKey } from "@motionly/shared";
import {
  deleteNarrationJobAssets,
  readNarrationAudio,
  storeNarrationAudio,
} from "../lib/narration-storage";
import {
  deleteRenderJobAssets,
  readRenderedVideo,
  storeRenderedVideo,
} from "../lib/render-storage";

async function main() {
  process.loadEnvFile(resolve(process.cwd(), "../../.env.local"));

  const jobId = `storage-check-${randomUUID()}`;
  const audio = Buffer.from("motionly narration storage check", "utf8");
  const video = Buffer.from("motionly video storage check", "utf8");
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "motionly-r2-check-"),
  );
  const videoPath = join(temporaryDirectory, "test.mp4");
  const identity = {
    ownerId: "storage-check-user",
    projectId: "storage-check-project",
    projectTitle: "Storage Contract Check",
    revision: 1,
  };
  let narrationAssetKey: string | undefined;
  let videoAssetKey: string | undefined;

  try {
    const narration = await storeNarrationAudio(
      { ...identity, jobId, sceneId: "scene-1" },
      audio,
    );
    narrationAssetKey = narration.assetKey;
    const storedAudio = await readNarrationAudio(narration.assetKey);
    const rangedAudio = await readNarrationAudio(narration.assetKey, {
      start: 0,
      end: 7,
    });
    if (
      !storedAudio.equals(audio) ||
      rangedAudio.toString("utf8") !== "motionly"
    ) {
      throw new Error("Narration object did not round-trip correctly.");
    }

    await writeFile(videoPath, video);
    videoAssetKey = createRenderedVideoAssetKey({ ...identity, jobId });
    await storeRenderedVideo(videoAssetKey, videoPath, video.byteLength);
    const storedVideo = await readRenderedVideo(videoAssetKey);
    const rangedVideo = await readRenderedVideo(videoAssetKey, {
      start: 9,
      end: 13,
    });
    if (
      !storedVideo.equals(video) ||
      rangedVideo.toString("utf8") !== "video"
    ) {
      throw new Error("Video object did not round-trip correctly.");
    }

    console.log(
      "R2 narration, video, and byte-range storage checks succeeded.",
    );
  } finally {
    await Promise.allSettled([
      deleteNarrationJobAssets(
        jobId,
        narrationAssetKey ? [narrationAssetKey] : [],
      ),
      deleteRenderJobAssets(jobId, videoAssetKey ? [videoAssetKey] : []),
      rm(temporaryDirectory, { recursive: true, force: true }),
    ]);
  }
}

void main();
