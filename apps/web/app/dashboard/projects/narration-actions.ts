"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { generateNarrationForOwner } from "../../../lib/narration-generation";

export type NarrationActionState = { message?: string };

export async function generateNarrationAction(
  projectId: string,
  _previousState: NarrationActionState,
  _formData: FormData,
): Promise<NarrationActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  const result = await generateNarrationForOwner(session.user.id, projectId);
  if (!result.ok) {
    const messages = {
      not_found: "This project could not be found.",
      not_approved: "Approve the current storyboard before generating audio.",
      already_generating:
        "Narration is already being generated. Refresh this page shortly.",
      generation_failed:
        "We could not generate the narration. Your approved storyboard is safe—please retry.",
    } as const;
    return { message: messages[result.reason] };
  }
  revalidatePath(`/dashboard/projects/${projectId}/storyboard`);
  revalidatePath(`/dashboard/projects/${projectId}/narration`);
  redirect(
    `/dashboard/projects/${projectId}/narration?${
      result.reused ? "ready" : "generated"
    }=1`,
  );
}
