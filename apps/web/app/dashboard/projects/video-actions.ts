"use server";

import { approveRenderedVideo } from "@motionly/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import {
  InstagramPublishingError,
  publishApprovedVideoToInstagram,
} from "../../../lib/instagram-publishing";
import { startVideoRenderForOwner } from "../../../lib/video-rendering";

export type VideoActionState = { message?: string };

export async function startVideoRenderAction(
  projectId: string,
  _previousState: VideoActionState,
  _formData: FormData,
): Promise<VideoActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  const result = await startVideoRenderForOwner(
    session.user.id,
    projectId,
  ).catch(() => null);
  if (!result) {
    return {
      message:
        "The video renderer is temporarily unavailable. Your approved work is safe—please try again.",
    };
  }
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

export async function publishInstagramAction(
  projectId: string,
  jobId: string,
  _previousState: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  if (formData.get("confirmation") !== "PUBLISH_INSTAGRAM") {
    return { message: "Confirm Instagram publishing before continuing." };
  }
  const caption = String(formData.get("caption") ?? "");
  const shareToFeed = formData.get("shareToFeed") === "on";
  try {
    await publishApprovedVideoToInstagram({
      ownerId: session.user.id,
      projectId,
      renderJobId: jobId,
      caption,
      shareToFeed,
    });
  } catch (error) {
    return {
      message:
        error instanceof InstagramPublishingError
          ? error.safeMessage
          : "Instagram could not publish this Reel. Your video is safe—please try again.",
    };
  }
  revalidatePath(`/dashboard/projects/${projectId}/video`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${projectId}/video?published=1`);
}
