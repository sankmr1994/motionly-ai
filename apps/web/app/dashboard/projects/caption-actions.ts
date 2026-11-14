"use server";

import { updateCaptionReview } from "@motionly/db";
import { captionEditsSchema } from "@motionly/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";

export type CaptionActionState = { message?: string };

export async function captionReviewAction(
  projectId: string,
  _previousState: CaptionActionState,
  formData: FormData,
): Promise<CaptionActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  const intent = formData.get("intent") === "approve" ? "approve" : "save";
  let cues: unknown;
  try {
    cues = JSON.parse(String(formData.get("cues") ?? "[]"));
  } catch {
    return { message: "Caption changes could not be read. Please try again." };
  }
  const input = captionEditsSchema.safeParse({
    jobId: formData.get("jobId"),
    version: formData.get("version"),
    style: formData.get("style"),
    cues,
  });
  if (!input.success) {
    return {
      message:
        "Each caption needs readable text of 80 characters or fewer. Please review your changes.",
    };
  }
  const result = await updateCaptionReview(
    session.user.id,
    projectId,
    input.data,
    intent === "approve",
  );
  if (!result.ok) {
    const messages = {
      not_found: "This narration or caption review could not be found.",
      invalid:
        "Caption timing is protected. Edit only the caption wording and style.",
      conflict:
        "Captions changed in another tab. Refresh before saving your edits.",
      already_approved: "These captions are already approved and locked.",
    } as const;
    return { message: messages[result.reason] };
  }
  revalidatePath(`/dashboard/projects/${projectId}/captions`);
  revalidatePath(`/dashboard/projects/${projectId}/narration`);
  redirect(
    `/dashboard/projects/${projectId}/captions?${
      result.status === "APPROVED" ? "approved" : "saved"
    }=1`,
  );
}
