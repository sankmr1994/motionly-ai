import { closeDatabaseConnection, getDatabase } from "@motionly/db";
import { resolve } from "node:path";
import { readNarrationAudio } from "../lib/narration-storage";
import { readRenderedVideo } from "../lib/render-storage";

type NarrationJob = {
  ownerId: string;
  scenes: Array<{ assetKey?: string }>;
};

type RenderJob = {
  ownerId: string;
  output?: { assetKey?: string };
};

function assertOwnerKey(ownerId: string, assetKey: string) {
  if (!assetKey.startsWith(`users/${ownerId}/projects/`)) {
    throw new Error("A media key is not grouped under its owning user.");
  }
}

async function main() {
  process.loadEnvFile(resolve(process.cwd(), "../../.env.local"));
  const database = await getDatabase();
  let narrationAssets = 0;
  let videos = 0;
  const owners = new Set<string>();

  try {
    const narrationJobs = await database
      .collection<NarrationJob>("narrationJobs")
      .find({ "scenes.assetKey": { $exists: true } })
      .toArray();
    for (const job of narrationJobs) {
      owners.add(job.ownerId);
      for (const scene of job.scenes) {
        if (!scene.assetKey) continue;
        assertOwnerKey(job.ownerId, scene.assetKey);
        const firstByte = await readNarrationAudio(scene.assetKey, {
          start: 0,
          end: 0,
        });
        if (firstByte.byteLength !== 1) {
          throw new Error("A referenced narration object was not readable.");
        }
        narrationAssets += 1;
      }
    }

    const renderJobs = await database
      .collection<RenderJob>("renderJobs")
      .find({ "output.assetKey": { $exists: true } })
      .toArray();
    for (const job of renderJobs) {
      const assetKey = job.output?.assetKey;
      if (!assetKey) continue;
      owners.add(job.ownerId);
      assertOwnerKey(job.ownerId, assetKey);
      const firstByte = await readRenderedVideo(assetKey, {
        start: 0,
        end: 0,
      });
      if (firstByte.byteLength !== 1) {
        throw new Error("A referenced video object was not readable.");
      }
      videos += 1;
    }

    console.log(
      `R2 reference verification succeeded for ${owners.size} user folder(s), ${narrationAssets} narration assets, and ${videos} videos.`,
    );
  } finally {
    await closeDatabaseConnection();
  }
}

void main();
