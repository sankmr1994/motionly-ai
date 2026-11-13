import {
  generateProjectStoryboard,
  StoryboardGenerationError,
} from "@motionly/ai";
import {
  beginProjectPlanning,
  completeProjectPlanning,
  failProjectPlanning,
  type ProjectPlan,
} from "@motionly/db";
import { logger } from "@motionly/observability";

export type PlanProjectResult =
  | { ok: true; plan: ProjectPlan }
  | {
      ok: false;
      reason:
        "not_found" | "not_ready" | "already_planning" | "generation_failed";
    };

export async function planProjectForOwner(
  ownerId: string,
  projectId: string,
): Promise<PlanProjectResult> {
  let started: Awaited<ReturnType<typeof beginProjectPlanning>>;
  try {
    started = await beginProjectPlanning(ownerId, projectId);
  } catch {
    logger.error("storyboard_planning_start_failed", {
      projectId,
      errorCode: "DATABASE_UNAVAILABLE",
    });
    return { ok: false, reason: "generation_failed" };
  }
  if (!started.ok) return started;
  try {
    const generated = await generateProjectStoryboard({
      inputMode: started.input.inputMode,
      content: started.input.content,
      video: started.input.video,
    });
    const plan = await completeProjectPlanning(
      ownerId,
      started.input.jobId,
      generated,
    );
    return { ok: true, plan };
  } catch (error) {
    logger.error("storyboard_generation_failed", {
      projectId,
      jobId: started.input.jobId,
      errorCode:
        error instanceof StoryboardGenerationError
          ? error.code
          : "UNEXPECTED_ERROR",
      providerStatus:
        error instanceof StoryboardGenerationError ? error.status : undefined,
    });
    try {
      await failProjectPlanning(ownerId, started.input.jobId);
    } catch {
      logger.error("storyboard_planning_cleanup_failed", {
        projectId,
        jobId: started.input.jobId,
        errorCode: "DATABASE_UNAVAILABLE",
      });
    }
    return { ok: false, reason: "generation_failed" };
  }
}
