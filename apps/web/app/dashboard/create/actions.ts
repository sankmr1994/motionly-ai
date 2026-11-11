"use server";

import { createProject } from "@motionly/db";
import {
  createProjectRequestSchema,
  type CreateProjectRequest,
} from "@motionly/shared";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";

export type DraftActionState = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function createTitle(content: string): string {
  const normalized = content
    .replace(/[#*_>`~\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const firstThought = normalized.split(/[.!?\n]/, 1)[0]?.trim() || normalized;
  if (!firstThought) return "Untitled video";
  return firstThought.length <= 72
    ? firstThought
    : `${firstThought.slice(0, 69).trimEnd()}…`;
}

export async function saveProjectDraft(
  _previousState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");

  const inputMode = String(formData.get("inputMode") ?? "TOPIC");
  const content = String(formData.get("content") ?? "").trim();
  const duration = Number(formData.get("duration") ?? 45);
  const video = {
    width: 720 as const,
    height: 1280 as const,
    fps: 30 as const,
    targetDurationSeconds: duration,
    style: "CLEAN_2D_EDUCATIONAL" as const,
  };
  const candidate =
    inputMode === "SCRIPT"
      ? {
          title: createTitle(content),
          inputMode: "SCRIPT" as const,
          sourceScript: content,
          video,
        }
      : {
          title: createTitle(content),
          inputMode: "TOPIC" as const,
          topic: content,
          video,
        };
  const result = createProjectRequestSchema.safeParse(candidate);
  if (!result.success) {
    return {
      message: "Please check your video idea and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await createProject(session.user.id, result.data as CreateProjectRequest);
  } catch {
    return {
      message:
        "We could not save this draft right now. Your text is still here—please try again.",
    };
  }
  redirect("/dashboard?created=1");
}
