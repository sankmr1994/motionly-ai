"use client";

import { useActionState } from "react";
import {
  generateNarrationAction,
  type NarrationActionState,
} from "../app/dashboard/projects/narration-actions";

const initialState: NarrationActionState = {};

export function NarrationActionButton({
  projectId,
  retry = false,
}: {
  projectId: string;
  retry?: boolean;
}) {
  const action = generateNarrationAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form className="narration-action-form" action={formAction}>
      <button className="narration-primary-action" disabled={pending}>
        <span aria-hidden="true">{retry ? "↻" : "▶"}</span>
        {pending
          ? "Generating scene audio…"
          : retry
            ? "Retry narration"
            : "Generate narration"}
      </button>
      {state.message ? (
        <p className="narration-action-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
