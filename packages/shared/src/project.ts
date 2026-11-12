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

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type ProjectInputMode = z.infer<typeof projectInputModeSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type VideoDefaults = z.infer<typeof videoDefaultsSchema>;
