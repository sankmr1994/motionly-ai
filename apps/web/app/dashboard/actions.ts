"use server";

import { deleteProject, renameProject, setProjectArchived } from "@motionly/db";
import { logger } from "@motionly/observability";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "../../lib/auth";
import { deleteNarrationJobAssets } from "../../lib/narration-storage";
import { deletePrivateObjects } from "../../lib/object-storage";
import { deleteRenderJobAssets } from "../../lib/render-storage";

export type ProjectActionResult = {
  ok: boolean;
  message: string;
};

async function getOwnerId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.emailVerified ? session.user.id : null;
}

export async function renameProjectAction(
  projectId: string,
  title: string,
): Promise<ProjectActionResult> {
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, message: "Please sign in again." };
  const normalizedTitle = title.trim();
  if (!normalizedTitle || normalizedTitle.length > 120) {
    return { ok: false, message: "Use a title between 1 and 120 characters." };
  }
  const project = await renameProject(ownerId, projectId, normalizedTitle);
  if (!project) return { ok: false, message: "This project was not found." };
  revalidatePath("/dashboard");
  return { ok: true, message: "Project renamed." };
}

export async function archiveProjectAction(
  projectId: string,
  archived: boolean,
): Promise<ProjectActionResult> {
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, message: "Please sign in again." };
  const project = await setProjectArchived(ownerId, projectId, archived);
  if (!project) return { ok: false, message: "This project was not found." };
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: archived ? "Project archived." : "Project restored.",
  };
}

export async function deleteProjectAction(
  projectId: string,
): Promise<ProjectActionResult> {
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, message: "Please sign in again." };
  const result = await deleteProject(ownerId, projectId);
  if (result.status === "busy") {
    return {
      ok: false,
      message:
        "This project is still processing. Please wait before deleting it.",
    };
  }
  if (result.status === "not_found") {
    return { ok: false, message: "This project was not found." };
  }
  const cleanup = await Promise.allSettled([
    deletePrivateObjects(result.assetKeys),
    ...result.narrationJobIds.map((jobId) => deleteNarrationJobAssets(jobId)),
    ...result.renderJobIds.map((jobId) => deleteRenderJobAssets(jobId)),
  ]);
  const failedCleanupCount = cleanup.filter(
    (item) => item.status === "rejected",
  ).length;
  if (failedCleanupCount > 0) {
    logger.error("project_media_cleanup_failed", {
      projectId,
      ownerId,
      failedCleanupCount,
      errorCode: "R2_DELETE_FAILED",
    });
  }
  revalidatePath("/dashboard");
  return { ok: true, message: "Project permanently deleted." };
}
