import { z } from "zod";
import type { CaptionScene, CaptionStyle } from "./captions";
import type { Storyboard } from "./storyboard";

export const renderJobStatusSchema = z.enum([
  "RENDERING",
  "COMPLETED",
  "FAILED",
]);
export const videoReviewStatusSchema = z.enum(["PENDING", "APPROVED"]);

export type RenderJobStatus = z.infer<typeof renderJobStatusSchema>;
export type VideoReviewStatus = z.infer<typeof videoReviewStatusSchema>;

export type ApprovedRenderInput = {
  storyboard: Storyboard;
  audioDurationsSeconds: Record<string, number>;
  captionStyle: CaptionStyle;
  captionScenes: CaptionScene[];
};

export type CompiledRenderTimeline = {
  durationInFrames: number;
  sceneDurationsSeconds: Record<string, number>;
  scenes: Array<{
    sceneId: string;
    fromFrame: number;
    durationInFrames: number;
  }>;
  captions: Array<{
    sceneId: string;
    startFrame: number;
    endFrame: number;
    text: string;
  }>;
};

export function compileApprovedRenderTimeline(
  input: ApprovedRenderInput,
): CompiledRenderTimeline {
  const fps = input.storyboard.video.fps;
  const captionByScene = new Map(
    input.captionScenes.map((scene) => [scene.sceneId, scene]),
  );
  const sceneDurationsSeconds: Record<string, number> = {};
  const scenes: CompiledRenderTimeline["scenes"] = [];
  const captions: CompiledRenderTimeline["captions"] = [];
  let fromFrame = 0;

  input.storyboard.scenes.forEach((scene) => {
    const durationSeconds = Math.max(
      scene.durationEstimateSeconds,
      input.audioDurationsSeconds[scene.id] ?? 0,
    );
    const durationInFrames = Math.max(1, Math.ceil(durationSeconds * fps));
    sceneDurationsSeconds[scene.id] = durationSeconds;
    scenes.push({ sceneId: scene.id, fromFrame, durationInFrames });
    captionByScene.get(scene.id)?.cues.forEach((cue) => {
      const startFrame =
        fromFrame + Math.max(0, Math.floor(cue.startSeconds * fps));
      const endFrame = Math.min(
        fromFrame + durationInFrames,
        fromFrame + Math.max(1, Math.ceil(cue.endSeconds * fps)),
      );
      if (endFrame > startFrame) {
        captions.push({
          sceneId: scene.id,
          startFrame,
          endFrame,
          text: cue.text,
        });
      }
    });
    fromFrame += durationInFrames;
  });

  return {
    durationInFrames: fromFrame,
    sceneDurationsSeconds,
    scenes,
    captions,
  };
}
