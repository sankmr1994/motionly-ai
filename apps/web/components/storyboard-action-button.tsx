"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import {
  storyboardWorkflowAction,
  type StoryboardActionMode,
  type StoryboardActionState,
} from "../app/dashboard/projects/actions";
import { StudioIcon } from "./studio-icon";

const initialState: StoryboardActionState = {};

export function StoryboardActionButton({
  mode,
  projectId,
  versionId = "",
  contentHash = "",
  variant = "primary",
  label,
  revision,
}: {
  mode: StoryboardActionMode;
  projectId: string;
  versionId?: string;
  contentHash?: string;
  variant?: "primary" | "secondary";
  label?: string;
  revision?: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const action = storyboardWorkflowAction.bind(
    null,
    mode,
    projectId,
    versionId,
    contentHash,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const labels = {
    plan: pending ? "Creating storyboard…" : "Plan storyboard",
    regenerate: pending ? "Creating a new plan…" : "Regenerate plan",
    approve: pending ? "Approving storyboard…" : "Approve storyboard",
  } as const;
  const needsConfirmation = mode === "regenerate" || mode === "approve";

  const trigger = (
    <button
      className={`storyboard-action-button ${variant}`}
      disabled={pending}
      type={needsConfirmation ? "button" : "submit"}
      onClick={() => {
        if (needsConfirmation) setConfirming(true);
      }}
    >
      <StudioIcon name={mode === "approve" ? "projects" : "sparkles"} />
      {pending ? labels[mode] : (label ?? labels[mode])}
    </button>
  );

  if (mode === "plan") {
    return (
      <form className="storyboard-action-form" action={formAction}>
        {trigger}
        {state.message ? (
          <span className="storyboard-action-error" role="alert">
            {state.message}
          </span>
        ) : null}
      </form>
    );
  }

  return (
    <div className="storyboard-action-form">
      {trigger}
      {state.message && !confirming ? (
        <span className="storyboard-action-error" role="alert">
          {state.message}
        </span>
      ) : null}

      {confirming && typeof document !== "undefined"
        ? createPortal(
            <div className="project-dialog-backdrop">
              <form
                className={`project-dialog ${
                  mode === "approve"
                    ? "storyboard-approve-dialog"
                    : "storyboard-regenerate-dialog"
                }`}
                action={formAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`storyboard-${mode}-title`}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !pending) setConfirming(false);
                }}
              >
                {mode === "approve" ? (
                  <>
                    <input type="hidden" name="confirmation" value="APPROVE" />
                    <span className="studio-eyebrow">FINAL APPROVAL</span>
                    <h3 id="storyboard-approve-title">
                      Approve Revision {revision}?
                    </h3>
                    <p>
                      This locks the storyboard as your approved plan. Motionly
                      will use this exact revision for the future narration and
                      video-generation steps.
                    </p>
                    <div className="storyboard-approval-summary">
                      <span aria-hidden="true">✓</span>
                      <p>
                        <strong>Review is complete</strong>
                        After approval, this project cannot regenerate or switch
                        storyboards in V1.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="studio-eyebrow">CREATE NEW REVISION</span>
                    <h3 id="storyboard-regenerate-title">
                      Regenerate this storyboard?
                    </h3>
                    <p>
                      Motionly will create a fresh AI storyboard for the same
                      idea. Your current storyboard stays safely saved in
                      revision history.
                    </p>
                    <div className="storyboard-regenerate-summary">
                      <div>
                        <span>{revision ?? "Current"}</span>
                        <p>
                          <strong>Current revision stays unchanged</strong>
                          It remains safely stored in revision history.
                        </p>
                      </div>
                      <div>
                        <span>{revision ? revision + 1 : "New"}</span>
                        <p>
                          <strong>
                            A new revision becomes your review copy
                          </strong>
                          Nothing is approved, narrated, or rendered
                          automatically.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {state.message ? (
                  <p className="project-dialog-error" role="alert">
                    {state.message}
                  </p>
                ) : null}
                <footer>
                  <button
                    autoFocus
                    className="project-dialog-cancel"
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirming(false)}
                  >
                    {mode === "approve"
                      ? "Continue reviewing"
                      : "Keep current revision"}
                  </button>
                  <button
                    className="project-dialog-confirm"
                    type="submit"
                    disabled={pending}
                  >
                    {mode === "approve"
                      ? pending
                        ? "Approving revision…"
                        : `Approve Revision ${revision}`
                      : pending
                        ? "Creating new revision…"
                        : `Create Revision ${revision ? revision + 1 : ""}`.trim()}
                  </button>
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
