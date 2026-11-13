import { z } from "zod";

const cueSchema = z.string().min(1).max(120).optional();

export const animationActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("SHOW"),
      targets: z.array(z.string().min(1).max(80)).min(1).max(20),
      sequence: z.enum(["TOGETHER", "STAGGERED"]).optional(),
      cue: cueSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("MOVE"),
      target: z.string().min(1).max(80),
      to: z.string().min(1).max(80),
      cue: cueSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("LABEL"),
      targets: z.array(z.string().min(1).max(80)).min(1).max(20),
      cue: cueSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("HIGHLIGHT"),
      target: z.string().min(1).max(80),
      cue: cueSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("DRAW"),
      target: z.string().min(1).max(80),
      cue: cueSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("ZOOM"),
      target: z.string().min(1).max(80),
      cue: cueSchema,
    })
    .strict(),
]);

export const sceneSchema = z
  .object({
    id: z.string().regex(/^scene_[0-9]{2}$/),
    title: z.string().min(1).max(60).optional(),
    durationEstimateSeconds: z.number().positive().max(30),
    template: z.enum([
      "TITLE",
      "BULLET_LIST",
      "TIMELINE",
      "PROCESS",
      "STAT_CARD",
      "ICON_GRID",
      "BEFORE_AFTER",
      "DIAGRAM",
      "SHADOW_DIAGRAM",
      "ECLIPSE_VIEW",
      "NUMBER_FLOW",
      "FORMULA",
      "GROWTH_CHART",
      "COMPARISON",
      "SORTED_ARRAY",
      "MIDPOINT",
      "DISCARD_HALF",
      "FOUND_TARGET",
      "COMPLEXITY",
    ]),
    narration: z.string().min(1).max(1_000),
    objects: z.array(z.string().min(1).max(80)).min(1).max(20),
    actions: z.array(animationActionSchema).min(1).max(20),
  })
  .strict();

export const storyboardSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    project: z
      .object({
        name: z.literal("Motionly AI"),
        inputMode: z.enum(["TOPIC", "SCRIPT"]),
        topic: z.string().min(1).max(500).optional(),
        sourceScript: z.string().min(1).max(5_000).optional(),
        contentType: z.literal("EXPLAINER"),
      })
      .strict(),
    video: z
      .object({
        width: z.literal(720),
        height: z.literal(1280),
        fps: z.literal(30),
        targetDurationSeconds: z.union([
          z.literal(30),
          z.literal(45),
          z.literal(60),
        ]),
        style: z.literal("CLEAN_2D_EDUCATIONAL"),
      })
      .strict(),
    scenes: z.array(sceneSchema).min(1).max(10),
  })
  .strict()
  .superRefine((storyboard, context) => {
    const duration = storyboard.scenes.reduce(
      (total, scene) => total + scene.durationEstimateSeconds,
      0,
    );
    if (Math.abs(duration - storyboard.video.targetDurationSeconds) > 0.001) {
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: `Scene durations must total ${storyboard.video.targetDurationSeconds} seconds; received ${duration}.`,
      });
    }

    const ids = storyboard.scenes.map((scene) => scene.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "Scene IDs must be unique.",
      });
    }

    if (storyboard.project.inputMode === "TOPIC" && !storyboard.project.topic) {
      context.addIssue({
        code: "custom",
        path: ["project", "topic"],
        message: "A topic is required in TOPIC mode.",
      });
    }

    if (
      storyboard.project.inputMode === "SCRIPT" &&
      !storyboard.project.sourceScript
    ) {
      context.addIssue({
        code: "custom",
        path: ["project", "sourceScript"],
        message: "A source script is required in SCRIPT mode.",
      });
    }
  });

export type AnimationAction = z.infer<typeof animationActionSchema>;
export type StoryboardScene = z.infer<typeof sceneSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;
export type StoryboardTemplate = StoryboardScene["template"];

export interface TimelineScene extends StoryboardScene {
  fromFrame: number;
  durationInFrames: number;
}

export const compileTimeline = (storyboard: Storyboard): TimelineScene[] => {
  let fromFrame = 0;
  return storyboard.scenes.map((scene) => {
    const durationInFrames = Math.round(
      scene.durationEstimateSeconds * storyboard.video.fps,
    );
    const timelineScene = { ...scene, fromFrame, durationInFrames };
    fromFrame += durationInFrames;
    return timelineScene;
  });
};
