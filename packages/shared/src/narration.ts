import { z } from "zod";

export const narrationJobStatusSchema = z.enum([
  "GENERATING",
  "COMPLETED",
  "FAILED",
]);

export const narrationSceneStatusSchema = z.enum(["PENDING", "READY"]);

export type NarrationJobStatus = z.infer<typeof narrationJobStatusSchema>;
export type NarrationSceneStatus = z.infer<typeof narrationSceneStatusSchema>;
