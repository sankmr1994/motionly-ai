import { closeDatabaseConnection, getDatabase } from "@motionly/db";
import { createRenderedVideoAssetKey } from "@motionly/shared";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  readNarrationAudio,
  storeNarrationAudio,
} from "../lib/narration-storage";
import { readRenderedVideo, storeRenderedVideo } from "../lib/render-storage";

type NarrationJob = {
  _id: { toHexString(): string };
  ownerId: string;
  projectId: { toHexString(): string };
  revision: number;
  scenes: Array<{ sceneId: string; assetKey?: string }>;
};

type RenderJob = {
  _id: { toHexString(): string };
  ownerId: string;
  projectId: { toHexString(): string };
  revision: number;
  output?: { assetKey: string };
};

type Project = { _id: { toHexString(): string }; title: string };

async function main() {
  process.loadEnvFile(resolve(process.cwd(), "../../.env.local"));
  const database = await getDatabase();
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "motionly-r2-migration-"),
  );
  let narrationAssetsMigrated = 0;
  let videosMigrated = 0;
  const projectTitles = new Map<string, string>();

  try {
    const projects = await database
      .collection<Project>("projects")
      .find({}, { projection: { title: 1 } })
      .toArray();
    projects.forEach((project) =>
      projectTitles.set(project._id.toHexString(), project.title),
    );
    const getProjectTitle = (projectId: string) => {
      const title = projectTitles.get(projectId);
      if (!title)
        throw new Error(`Project title was not found for ${projectId}.`);
      return title;
    };

    const narrationJobs = await database
      .collection<NarrationJob>("narrationJobs")
      .find({ "scenes.assetKey": { $exists: true } })
      .toArray();
    for (const job of narrationJobs) {
      const jobId = job._id.toHexString();
      const projectId = job.projectId.toHexString();
      const projectTitle = getProjectTitle(projectId);
      for (const scene of job.scenes) {
        const previousKey = scene.assetKey;
        if (!previousKey || previousKey.startsWith("users/")) continue;
        const audio = await readNarrationAudio(previousKey);
        const stored = await storeNarrationAudio(
          {
            ownerId: job.ownerId,
            projectId,
            projectTitle,
            revision: job.revision,
            jobId,
            sceneId: scene.sceneId,
          },
          audio,
        );
        const updated = await database
          .collection<NarrationJob>("narrationJobs")
          .updateOne(
            { _id: job._id },
            { $set: { "scenes.$[scene].assetKey": stored.assetKey } },
            {
              arrayFilters: [
                {
                  "scene.sceneId": scene.sceneId,
                  "scene.assetKey": previousKey,
                },
              ],
            },
          );
        if (updated.modifiedCount) narrationAssetsMigrated += 1;
      }
    }

    const renderJobs = await database
      .collection<RenderJob>("renderJobs")
      .find({ "output.assetKey": { $exists: true } })
      .toArray();
    for (const job of renderJobs) {
      const previousKey = job.output?.assetKey;
      if (!previousKey || previousKey.startsWith("users/")) continue;
      const video = await readRenderedVideo(previousKey);
      const jobId = job._id.toHexString();
      const projectId = job.projectId.toHexString();
      const projectTitle = getProjectTitle(projectId);
      const path = join(temporaryDirectory, `${jobId}.mp4`);
      const nextKey = createRenderedVideoAssetKey({
        ownerId: job.ownerId,
        projectId,
        projectTitle,
        revision: job.revision,
        jobId,
      });
      await writeFile(path, video);
      await storeRenderedVideo(nextKey, path, video.byteLength);
      const updated = await database
        .collection<RenderJob>("renderJobs")
        .updateOne(
          { _id: job._id, "output.assetKey": previousKey },
          { $set: { "output.assetKey": nextKey } },
        );
      if (updated.modifiedCount) videosMigrated += 1;
    }

    console.log(
      `R2 migration completed: ${narrationAssetsMigrated} narration assets and ${videosMigrated} videos. Legacy source objects and local fallback files were retained.`,
    );
  } finally {
    await Promise.allSettled([
      rm(temporaryDirectory, { recursive: true, force: true }),
      closeDatabaseConnection(),
    ]);
  }
}

void main();
