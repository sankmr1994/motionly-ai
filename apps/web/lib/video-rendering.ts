import {
  beginVideoRender,
  completeVideoRender,
  failVideoRender,
  updateVideoRenderProgress,
  type VideoRenderInput,
} from "@motionly/db";
import { compileApprovedRenderTimeline } from "@motionly/shared";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { readNarrationAudio } from "./narration-storage";
import {
  cleanupRenderInputs,
  getRenderedVideoSize,
  prepareRenderWorkspace,
} from "./render-storage";

async function executeVideoRender(ownerId: string, input: VideoRenderInput) {
  try {
    const compiled = compileApprovedRenderTimeline({
      storyboard: input.storyboard,
      audioDurationsSeconds: Object.fromEntries(
        input.sceneAudio.map((scene) => [scene.sceneId, scene.durationSeconds]),
      ),
      captionStyle: input.captions.style,
      captionScenes: input.captions.scenes,
    });
    const audio = await Promise.all(
      input.sceneAudio.map(async (scene) => ({
        sceneId: scene.sceneId,
        audio: await readNarrationAudio(scene.assetKey),
      })),
    );
    const sceneAudioFiles = Object.fromEntries(
      input.sceneAudio.map((scene) => [
        scene.sceneId,
        `${scene.sceneId}_audio.mp3`,
      ]),
    );
    const workspace = await prepareRenderWorkspace(input.jobId, audio, {
      storyboard: input.storyboard,
      sceneAudioFiles,
      sceneDurationsSeconds: compiled.sceneDurationsSeconds,
      captionStyle: input.captions.style,
      captions: compiled.captions,
    });
    const workspaceRoot = resolve(process.cwd(), "../..");
    const pnpmArgs = [
      "--filter",
      "@motionly/video",
      "exec",
      "node",
      "scripts/render-job.mjs",
      workspace.propsPath,
      workspace.publicDir,
      workspace.outputPath,
    ];
    const command =
      process.platform === "win32"
        ? (process.env.ComSpec ?? "cmd.exe")
        : "pnpm";
    const args =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "pnpm.cmd", ...pnpmArgs]
        : pnpmArgs;
    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn(/* turbopackIgnore: true */ command, args, {
        cwd: workspaceRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      let safeError = "";
      let stdout = "";
      let lastProgress = 5;
      let progressWrites = Promise.resolve();
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
        const lines = stdout.split(/\r?\n/u);
        stdout = lines.pop() ?? "";
        lines.forEach((line) => {
          const match = /^MOTIONLY_PROGRESS:(\d{1,3})$/u.exec(line.trim());
          if (!match) return;
          const progress = Number(match[1]);
          if (progress <= lastProgress || progress > 99) return;
          lastProgress = progress;
          progressWrites = progressWrites
            .catch(() => undefined)
            .then(() =>
              updateVideoRenderProgress(ownerId, input.jobId, progress),
            )
            .catch(() => undefined);
        });
      });
      child.stderr.on("data", (chunk) => {
        safeError = `${safeError}${String(chunk)}`.slice(-2_000);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) progressWrites.then(resolvePromise, reject);
        else
          reject(
            new Error(`Remotion render exited with code ${code}. ${safeError}`),
          );
      });
    });
    await updateVideoRenderProgress(ownerId, input.jobId, 95);
    const byteLength = await getRenderedVideoSize(workspace.outputPath);
    await completeVideoRender(ownerId, input.jobId, {
      assetKey: workspace.outputAssetKey,
      mimeType: "video/mp4",
      byteLength,
      durationSeconds: compiled.durationInFrames / input.storyboard.video.fps,
      width: 720,
      height: 1280,
      fps: 30,
    });
    await cleanupRenderInputs(input.jobId);
  } catch (error) {
    await failVideoRender(ownerId, input.jobId, error).catch(() => undefined);
    await cleanupRenderInputs(input.jobId).catch(() => undefined);
  }
}

export async function startVideoRenderForOwner(
  ownerId: string,
  projectId: string,
): Promise<
  | { ok: true; jobId: string; reused: boolean }
  | {
      ok: false;
      reason: "not_found" | "not_ready" | "already_rendering";
      jobId?: string;
    }
> {
  const result = await beginVideoRender(ownerId, projectId);
  if (!result.ok) {
    if (result.reason === "already_completed") {
      return { ok: true, jobId: result.jobId!, reused: true };
    }
    if (result.reason === "already_rendering") {
      return {
        ok: false,
        reason: "already_rendering",
        jobId: result.jobId,
      };
    }
    return { ok: false, reason: result.reason };
  }
  void executeVideoRender(ownerId, result.input);
  return { ok: true, jobId: result.input.jobId, reused: false };
}
