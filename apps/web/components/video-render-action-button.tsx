"use client";

import { useActionState } from "react";
import {
  startVideoRenderAction,
  type VideoActionState,
} from "../app/dashboard/projects/video-actions";

const initialState: VideoActionState = {};

export function VideoRenderActionButton({
  projectId,
  retry = false,
  label,
}: {
  projectId: string;
  retry?: boolean;
  label?: string;
}) {
  const action = startVideoRenderAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form className="video-render-action-form" action={formAction}>
      <button className="video-primary-action" disabled={pending}>
        <span aria-hidden="true">{retry ? "↻" : "▶"}</span>
        {pending
          ? "Starting renderer…"
          : retry
            ? "Retry video render"
            : (label ?? "Generate video")}
      </button>
      {state.message ? (
        <p className="video-action-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
