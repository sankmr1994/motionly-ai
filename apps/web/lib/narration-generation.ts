import {
  generateTimestampedSpeech,
  getElevenLabsConfig,
  getSpeechDurationSeconds,
  SpeechGenerationError,
} from "@motionly/ai";
import {
  beginNarrationGeneration,
  completeNarrationGeneration,
  completeNarrationScene,
  failNarrationGeneration,
} from "@motionly/db";
import { logger } from "@motionly/observability";
import {
  deleteNarrationJobAssets,
  storeNarrationAudio,
} from "./narration-storage";

export type GenerateNarrationResult =
  | { ok: true; jobId: string; reused: boolean }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_approved"
        | "already_generating"
        | "generation_failed";
      jobId?: string;
    };

export async function generateNarrationForOwner(
  ownerId: string,
  projectId: string,
): Promise<GenerateNarrationResult> {
  let config: ReturnType<typeof getElevenLabsConfig>;
  try {
    config = getElevenLabsConfig();
  } catch {
    logger.error("narration_provider_not_configured", {
      projectId,
      errorCode: "PROVIDER_NOT_CONFIGURED",
    });
    return { ok: false, reason: "generation_failed" };
  }
  let started: Awaited<ReturnType<typeof beginNarrationGeneration>>;
  try {
    started = await beginNarrationGeneration(ownerId, projectId, {
      provider: "ELEVENLABS",
      model: config.modelId,
      displayName: config.voiceName,
    });
  } catch {
    logger.error("narration_generation_start_failed", {
      projectId,
      errorCode: "DATABASE_UNAVAILABLE",
    });
    return { ok: false, reason: "generation_failed" };
  }
  if (!started.ok) {
    if (started.reason === "already_completed") {
      return started.jobId
        ? { ok: true, jobId: started.jobId, reused: true }
        : { ok: false, reason: "generation_failed" };
    }
    return {
      ok: false,
      reason: started.reason,
      ...(started.jobId ? { jobId: started.jobId } : {}),
    };
  }

  const { jobId, scenes } = started.input;
  try {
    for (const scene of scenes) {
      const speech = await generateTimestampedSpeech(scene.narration, {
        speed: 1.08,
      });
      const durationSeconds = getSpeechDurationSeconds(speech);
      const alignment = speech.normalizedAlignment ?? speech.alignment;
      if (!alignment) throw new SpeechGenerationError();
      const stored = await storeNarrationAudio(
        jobId,
        scene.sceneId,
        speech.audio,
      );
      await completeNarrationScene(ownerId, jobId, scene.sceneId, {
        ...stored,
        durationSeconds,
        alignment: {
          characters: alignment.characters,
          characterStartTimesSeconds: alignment.character_start_times_seconds,
          characterEndTimesSeconds: alignment.character_end_times_seconds,
        },
      });
    }
    await completeNarrationGeneration(ownerId, jobId);
    return { ok: true, jobId, reused: false };
  } catch (error) {
    logger.error("narration_generation_failed", {
      projectId,
      jobId,
      errorCode:
        error instanceof SpeechGenerationError
          ? "ELEVENLABS_REQUEST_FAILED"
          : "UNEXPECTED_ERROR",
      providerStatus:
        error instanceof SpeechGenerationError ? error.status : undefined,
    });
    try {
      await failNarrationGeneration(ownerId, jobId);
      await deleteNarrationJobAssets(jobId);
    } catch {
      logger.error("narration_generation_cleanup_failed", {
        projectId,
        jobId,
        errorCode: "CLEANUP_FAILED",
      });
    }
    return { ok: false, reason: "generation_failed", jobId };
  }
}
