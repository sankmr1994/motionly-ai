"use server";

import {
  deleteDraftProject,
  renameProject,
  setProjectArchived,
} from "@motionly/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "../../lib/auth";

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

export async function deleteDraftProjectAction(
  projectId: string,
): Promise<ProjectActionResult> {
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, message: "Please sign in again." };
  const result = await deleteDraftProject(ownerId, projectId);
  if (result === "not_draft") {
    return {
      ok: false,
      message: "Only draft projects can be permanently deleted.",
    };
  }
  if (result === "not_found") {
    return { ok: false, message: "This project was not found." };
  }
  revalidatePath("/dashboard");
  return { ok: true, message: "Draft permanently deleted." };
}
