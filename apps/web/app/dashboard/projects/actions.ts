"use server";

import {
  approveProjectPlan,
  createEditedProjectStoryboardRevision,
  makeProjectStoryboardRevisionCurrent,
} from "@motionly/db";
import { editProjectStoryboardRequestSchema } from "@motionly/shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { planProjectForOwner } from "../../../lib/project-planning";

export type StoryboardActionState = { message?: string };
export type StoryboardActionMode = "plan" | "regenerate" | "approve";

export async function saveStoryboardEditsAction(
  projectId: string,
  _previousState: StoryboardActionState,
  formData: FormData,
): Promise<StoryboardActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  const sceneIds = formData.getAll("sceneId");
  const titles = formData.getAll("title");
  const narrations = formData.getAll("narration");
  const objectsJson = formData.getAll("objectsJson");
  let objects: unknown[];
  try {
    objects = objectsJson.map((value) =>
      typeof value === "string" ? JSON.parse(value) : null,
    );
  } catch {
    return { message: "The visual labels could not be read." };
  }
  const parsed = editProjectStoryboardRequestSchema.safeParse({
    basedOnVersionId: formData.get("basedOnVersionId"),
    expectedContentHash: formData.get("expectedContentHash"),
    confirmation: formData.get("confirmation"),
    scenes: sceneIds.map((id, index) => ({
      id,
      title: titles[index],
      narration: narrations[index],
      objects: objects[index],
    })),
  });
  if (!parsed.success) {
    return {
      message:
        parsed.error.issues[0]?.message ?? "Review the edited scene fields.",
    };
  }
  const result = await createEditedProjectStoryboardRevision(
    session.user.id,
    projectId,
    parsed.data,
  );
  if (!result.ok) {
    const messages = {
      not_found: "This storyboard could not be found.",
      not_ready: "Only the current unapproved storyboard can be edited.",
      conflict:
        "This storyboard changed while you were editing. Refresh and try again.",
      no_changes: "Change at least one scene before saving.",
      invalid_edits: result.message ?? "The edited storyboard is not valid.",
    } as const;
    return { message: messages[result.reason] };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectId}/storyboard`);
  redirect(`/dashboard/projects/${projectId}/storyboard?edited=1`);
}

export async function makeStoryboardRevisionCurrentAction(
  projectId: string,
  _previousState: StoryboardActionState,
  formData: FormData,
): Promise<StoryboardActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  const versionId = formData.get("versionId");
  if (typeof versionId !== "string" || !versionId) {
    return { message: "The revision could not be found." };
  }
  const result = await makeProjectStoryboardRevisionCurrent(
    session.user.id,
    projectId,
    versionId,
  );
  const messages = {
    not_found: "The revision could not be found.",
    not_ready: "This project cannot switch revisions in its current state.",
    current: "This revision is already current.",
    conflict: "The project changed. Refresh and try again.",
  } as const;
  if (result !== "selected") return { message: messages[result] };
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectId}/storyboard`);
  redirect(`/dashboard/projects/${projectId}/storyboard?selected=1`);
}

export async function storyboardWorkflowAction(
  mode: StoryboardActionMode,
  projectId: string,
  versionId: string,
  contentHash: string,
  _previousState: StoryboardActionState,
  _formData: FormData,
): Promise<StoryboardActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");

  if (mode === "approve") {
    if (_formData.get("confirmation") !== "APPROVE") {
      return { message: "Confirm approval before locking this storyboard." };
    }
    const result = await approveProjectPlan(
      session.user.id,
      projectId,
      versionId,
      contentHash,
    );
    if (result === "not_found") return { message: "Storyboard not found." };
    if (result === "conflict") {
      return {
        message:
          "This storyboard changed before approval. Refresh and review the latest version.",
      };
    }
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/projects/${projectId}/storyboard`);
    redirect(`/dashboard/projects/${projectId}/storyboard?approved=1`);
  }

  const result = await planProjectForOwner(session.user.id, projectId);
  if (!result.ok) {
    const messages = {
      not_found: "This project was not found.",
      not_ready: "This project cannot be planned in its current state.",
      already_planning:
        "The current storyboard attempt is still finishing. Please wait one minute, refresh, and retry.",
      generation_failed:
        "We could not create the storyboard right now. Your draft is safe—please try again.",
    } as const;
    return { message: messages[result.reason] };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectId}/storyboard`);
  redirect(`/dashboard/projects/${projectId}/storyboard`);
}
