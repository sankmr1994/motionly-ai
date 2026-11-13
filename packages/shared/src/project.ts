import { z } from "zod";

export const projectInputModeSchema = z.enum(["TOPIC", "SCRIPT"]);

export const projectStatusSchema = z.enum([
  "DRAFT",
  "PLANNING",
  "REVIEW_READY",
  "APPROVED",
  "GENERATING",
  "READY",
  "FAILED",
  "ARCHIVED",
  "DELETING",
]);

export const videoDefaultsSchema = z
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
  .strict();

const projectBaseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  video: videoDefaultsSchema,
});

export const createProjectRequestSchema = z.discriminatedUnion("inputMode", [
  projectBaseSchema
    .extend({
      inputMode: z.literal("TOPIC"),
      topic: z.string().trim().min(3).max(500),
    })
    .strict(),
  projectBaseSchema
    .extend({
      inputMode: z.literal("SCRIPT"),
      sourceScript: z.string().trim().min(1).max(5_000),
    })
    .strict(),
]);

export const updateProjectRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => value.title !== undefined || value.archived !== undefined,
    {
      message: "At least one project field is required.",
    },
  );

export const approveProjectVersionRequestSchema = z
  .object({
    contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    confirmation: z.literal("APPROVE"),
  })
  .strict();

export const makeProjectVersionCurrentRequestSchema = z
  .object({ confirmation: z.literal("MAKE_CURRENT") })
  .strict();

export const editedStoryboardSceneSchema = z
  .object({
    id: z.string().regex(/^scene_[0-9]{2}$/),
    title: z.string().trim().min(1).max(60),
    narration: z.string().trim().min(1).max(1_000),
    objects: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  })
  .strict();

export const editProjectStoryboardRequestSchema = z
  .object({
    basedOnVersionId: z.string().regex(/^[a-f0-9]{24}$/),
    expectedContentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    scenes: z.array(editedStoryboardSceneSchema).min(1).max(10),
    confirmation: z.literal("SAVE_EDITS"),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.scenes.map((scene) => scene.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "Edited scene IDs must be unique.",
      });
    }
  });

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type ApproveProjectVersionRequest = z.infer<
  typeof approveProjectVersionRequestSchema
>;
export type MakeProjectVersionCurrentRequest = z.infer<
  typeof makeProjectVersionCurrentRequestSchema
>;
export type EditProjectStoryboardRequest = z.infer<
  typeof editProjectStoryboardRequestSchema
>;
export type ProjectInputMode = z.infer<typeof projectInputModeSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type VideoDefaults = z.infer<typeof videoDefaultsSchema>;
