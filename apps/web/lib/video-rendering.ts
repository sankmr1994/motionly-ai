import { getVideoRenderingConfig } from "@motionly/config";
import {
  attachVideoRenderExecution,
  beginVideoRender,
  completeVideoRender,
  failVideoRender,
  getActiveVideoRenderExecution,
  updateVideoRenderProgress,
  type VideoRenderInput,
} from "@motionly/db";
import { compileApprovedRenderTimeline } from "@motionly/shared";
import { logger } from "@motionly/observability";
import { bundle } from "@remotion/bundler";
import {
  addBundleToSandbox,
  createSandbox,
  getRenderProgress,
  renderMediaOnVercel,
} from "@remotion/vercel";
import { del as deleteBlob, get as getBlob } from "@vercel/blob";
import { Sandbox } from "@vercel/sandbox";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { readNarrationAudio } from "./narration-storage";
import {
  cleanupRenderInputs,
  cleanupRenderWorkspace,
  deleteRenderJobAssets,
  getRenderedVideoSize,
  prepareRenderWorkspace,
  storeRenderedVideo,
  storeRenderedVideoBytes,
} from "./render-storage";

const SANDBOX_RENDER_TIMEOUT_MS = 40 * 60 * 1_000;

type SandboxRenderStage =
  | "prepare"
  | "bundle"
  | "sandbox_create"
  | "bundle_upload"
  | "render_start"
  | "execution_attach";

function getVideoEntryPoint() {
  const candidates = [
    resolve(process.cwd(), "../../packages/video/src/register.ts"),
    resolve(process.cwd(), "packages/video/src/register.ts"),
    resolve(process.cwd(), "../packages/video/src/register.ts"),
  ];
  return (
    candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!
  );
}

function getSharedEntryPoint() {
  const candidates = [
    resolve(process.cwd(), "../../packages/shared/src/index.ts"),
    resolve(process.cwd(), "packages/shared/src/index.ts"),
    resolve(process.cwd(), "../packages/shared/src/index.ts"),
  ];
  return (
    candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!
  );
}

function getErrorFingerprint(error: unknown) {
  const value =
    error instanceof Error
      ? `${error.name}:${error.message}`
      : String(error);
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

async function prepareVideoRender(ownerId: string, input: VideoRenderInput) {
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
  const renderProps = {
    storyboard: input.storyboard,
    sceneAudioFiles,
    sceneDurationsSeconds: compiled.sceneDurationsSeconds,
    captionStyle: input.captions.style,
    captions: compiled.captions,
  };
  const workspace = await prepareRenderWorkspace(
    input.jobId,
    audio,
    renderProps,
    {
      ownerId,
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      revision: input.revision,
    },
  );
  return {
    compiled,
    renderProps,
    workspace,
    durationSeconds: compiled.durationInFrames / input.storyboard.video.fps,
  };
}

async function executeLocalVideoRender(
  ownerId: string,
  input: VideoRenderInput,
) {
  let uploadedAssetKey: string | undefined;
  try {
    const prepared = await prepareVideoRender(ownerId, input);
    const workspaceRoot = resolve(process.cwd(), "../..");
    const pnpmArgs = [
      "--filter",
      "@motionly/video",
      "exec",
      "node",
      "scripts/render-job.mjs",
      prepared.workspace.propsPath,
      prepared.workspace.publicDir,
      prepared.workspace.outputPath,
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
    const byteLength = await getRenderedVideoSize(
      prepared.workspace.outputPath,
    );
    await storeRenderedVideo(
      prepared.workspace.outputAssetKey,
      prepared.workspace.outputPath,
      byteLength,
    );
    uploadedAssetKey = prepared.workspace.outputAssetKey;
    await updateVideoRenderProgress(ownerId, input.jobId, 99);
    await completeVideoRender(ownerId, input.jobId, {
      assetKey: prepared.workspace.outputAssetKey,
      mimeType: "video/mp4",
      byteLength,
      durationSeconds: prepared.durationSeconds,
      width: 720,
      height: 1280,
      fps: 30,
    });
    await cleanupRenderWorkspace(input.jobId);
  } catch (error) {
    await failVideoRender(ownerId, input.jobId, error).catch(() => undefined);
    await cleanupRenderInputs(input.jobId).catch(() => undefined);
    if (uploadedAssetKey) {
      await deleteRenderJobAssets(input.jobId, [uploadedAssetKey]).catch(
        () => undefined,
      );
    }
  }
}

async function stopSandbox(sandboxId: string) {
  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.stop();
}

async function startSandboxVideoRender(
  ownerId: string,
  input: VideoRenderInput,
) {
  const config = getVideoRenderingConfig();
  if (!config.blobToken) {
    throw new Error("Temporary private Blob storage is not configured.");
  }
  let sandbox: Awaited<ReturnType<typeof createSandbox>> | undefined;
  let bundleDirectory: string | undefined;
  let stage: SandboxRenderStage = "prepare";
  try {
    const prepared = await prepareVideoRender(ownerId, input);
    await updateVideoRenderProgress(ownerId, input.jobId, 6);
    stage = "bundle";
    const entryPoint = getVideoEntryPoint();
    bundleDirectory = await bundle({
      entryPoint,
      publicDir: prepared.workspace.publicDir,
      webpackOverride: (configuration) => ({
        ...configuration,
        resolve: {
          ...configuration.resolve,
          alias: {
            ...configuration.resolve?.alias,
            "@motionly/shared": getSharedEntryPoint(),
          },
        },
      }),
      onProgress: (progress) => {
        void updateVideoRenderProgress(
          ownerId,
          input.jobId,
          6 + Math.round(progress * 4),
        ).catch(() => undefined);
      },
    });
    stage = "sandbox_create";
    sandbox = await createSandbox({
      resources: { vcpus: 2 },
      onProgress: ({ progress }) =>
        updateVideoRenderProgress(
          ownerId,
          input.jobId,
          10 + Math.round(progress * 2),
        ),
    });
    stage = "bundle_upload";
    // @remotion/vercel creates child directories such as
    // `remotion-bundle/public`, but current Vercel Sandboxes require the
    // parent directory to exist first.
    await sandbox.mkDir("remotion-bundle");
    await addBundleToSandbox({ sandbox, bundleDir: bundleDirectory });
    const blobPath = `motionly-render-staging/${input.jobId}.mp4`;
    stage = "render_start";
    const detached = await renderMediaOnVercel({
      sandbox,
      compositionId: "MotionlyExplainer",
      inputProps: prepared.renderProps,
      outputFile: `/tmp/motionly-${input.jobId}.mp4`,
      codec: "h264",
      crf: 20,
      concurrency: 2,
      logLevel: "warn",
      licenseKey: config.remotionLicenseKey,
      isProduction: true,
      detached: true,
      detachedSandboxTimeoutInMilliseconds: SANDBOX_RENDER_TIMEOUT_MS,
      vercelBlob: {
        blobToken: config.blobToken,
        access: "private",
        blobPath,
      },
    });
    stage = "execution_attach";
    await attachVideoRenderExecution(ownerId, input.jobId, {
      provider: "VERCEL_SANDBOX",
      sandboxId: detached.sandboxId,
      commandId: detached.cmdId,
      blobPath,
      outputAssetKey: prepared.workspace.outputAssetKey,
      durationSeconds: prepared.durationSeconds,
      width: 720,
      height: 1280,
      fps: 30,
    });
    // The durable execution is attached at this point. Ephemeral cleanup must
    // never cancel a render that is already running in the Sandbox.
    await cleanupRenderWorkspace(input.jobId).catch(() => undefined);
    await rm(bundleDirectory, { recursive: true, force: true }).catch(
      () => undefined,
    );
  } catch (error) {
    if (sandbox) await sandbox.stop().catch(() => undefined);
    if (bundleDirectory) {
      await rm(bundleDirectory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
    await cleanupRenderWorkspace(input.jobId).catch(() => undefined);
    await failVideoRender(ownerId, input.jobId, error).catch(() => undefined);
    logger.error("video_render_start_failed", {
      projectId: input.projectId,
      jobId: input.jobId,
      provider: "VERCEL_SANDBOX",
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message.slice(0, 1_000) : String(error),
      errorFingerprint: getErrorFingerprint(error),
      workingDirectory: process.cwd(),
      videoEntryPoint: getVideoEntryPoint(),
    });
    throw error;
  }
}

export async function reconcileVideoRenderForOwner(
  ownerId: string,
  projectId: string,
) {
  const active = await getActiveVideoRenderExecution(ownerId, projectId);
  if (!active) return;
  const config = getVideoRenderingConfig();
  if (!config.blobToken) return;
  const progress = await getRenderProgress({
    sandboxId: active.execution.sandboxId,
    cmdId: active.execution.commandId,
  });
  if (progress.stage === "expired") {
    await failVideoRender(
      ownerId,
      active.jobId,
      new Error("Vercel Sandbox expired before the render was collected."),
    );
    return;
  }
  if (progress.stage === "error") {
    logger.error("video_render_execution_failed", {
      projectId,
      jobId: active.jobId,
      provider: active.execution.provider,
      sandboxId: active.execution.sandboxId,
      commandId: active.execution.commandId,
      errorMessage: progress.message.slice(0, 2_000),
    });
    await failVideoRender(ownerId, active.jobId, new Error(progress.message));
    await stopSandbox(active.execution.sandboxId).catch(() => undefined);
    return;
  }
  if (progress.stage !== "done") {
    await updateVideoRenderProgress(
      ownerId,
      active.jobId,
      12 + Math.round(progress.overallProgress * 82),
    );
    return;
  }

  let uploaded = false;
  try {
    await updateVideoRenderProgress(ownerId, active.jobId, 95);
    const blob = await getBlob(progress.url, {
      access: "private",
      token: config.blobToken,
      useCache: false,
    });
    if (!blob || blob.statusCode !== 200) {
      throw new Error(
        "Rendered video could not be read from temporary storage.",
      );
    }
    const video = new Uint8Array(await new Response(blob.stream).arrayBuffer());
    await storeRenderedVideoBytes(active.execution.outputAssetKey, video);
    uploaded = true;
    await updateVideoRenderProgress(ownerId, active.jobId, 99);
    await completeVideoRender(ownerId, active.jobId, {
      assetKey: active.execution.outputAssetKey,
      mimeType: "video/mp4",
      byteLength: progress.size,
      durationSeconds: active.execution.durationSeconds,
      width: active.execution.width,
      height: active.execution.height,
      fps: active.execution.fps,
    });
    await deleteBlob(progress.url, { token: config.blobToken }).catch(
      () => undefined,
    );
    await stopSandbox(active.execution.sandboxId).catch(() => undefined);
  } catch (error) {
    await failVideoRender(ownerId, active.jobId, error).catch(() => undefined);
    await stopSandbox(active.execution.sandboxId).catch(() => undefined);
    if (uploaded) {
      await deleteRenderJobAssets(active.jobId, [
        active.execution.outputAssetKey,
      ]).catch(() => undefined);
    }
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
  // Validate hosted-render credentials before creating a durable job. This
  // avoids leaving a job in RENDERING when deployment configuration is absent.
  const config = getVideoRenderingConfig();
  await reconcileVideoRenderForOwner(ownerId, projectId).catch(() => undefined);
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

  if (config.provider === "local") {
    void executeLocalVideoRender(ownerId, result.input);
  } else {
    await startSandboxVideoRender(ownerId, result.input);
  }
  return { ok: true, jobId: result.input.jobId, reused: false };
}
