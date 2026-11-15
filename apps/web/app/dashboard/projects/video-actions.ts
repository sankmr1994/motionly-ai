"use server";

import { approveRenderedVideo } from "@motionly/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { startVideoRenderForOwner } from "../../../lib/video-rendering";

export type VideoActionState = { message?: string };

export async function startVideoRenderAction(
  projectId: string,
  _previousState: VideoActionState,
  _formData: FormData,
): Promise<VideoActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  const result = await startVideoRenderForOwner(session.user.id, projectId);
  if (!result.ok && result.reason !== "already_rendering") {
    const messages = {
      not_found: "This project could not be found.",
      not_ready:
        "Approve the current storyboard, narration, and captions before rendering.",
    } as const;
    return { message: messages[result.reason] };
  }
  revalidatePath(`/dashboard/projects/${projectId}/captions`);
  revalidatePath(`/dashboard/projects/${projectId}/video`);
  redirect(
    `/dashboard/projects/${projectId}/video?${
      !result.ok ? "rendering" : result.reused ? "ready" : "started"
    }=1`,
  );
}

export async function approveVideoAction(
  projectId: string,
  jobId: string,
  _previousState: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  if (formData.get("confirmation") !== "APPROVE_VIDEO") {
    return { message: "Confirm approval before continuing." };
  }
  const result = await approveRenderedVideo(session.user.id, projectId, jobId);
  if (!result.ok) {
    return {
      message:
        "This finished video could not be approved. Refresh and try again.",
    };
  }
  revalidatePath(`/dashboard/projects/${projectId}/video`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${projectId}/video?approved=1`);
}
