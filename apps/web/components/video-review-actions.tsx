"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import {
  approveVideoAction,
  type VideoActionState,
} from "../app/dashboard/projects/video-actions";

const initialState: VideoActionState = {};

export function VideoReviewActions({
  projectId,
  jobId,
}: {
  projectId: string;
  jobId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const action = approveVideoAction.bind(null, projectId, jobId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <>
      <button
        className="video-approve-button"
        type="button"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        ✓ Approve finished video
      </button>
      {state.message ? (
        <p className="video-action-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {confirming && typeof document !== "undefined"
        ? createPortal(
            <div className="project-dialog-backdrop">
              <form
                className="project-dialog video-approve-dialog"
                action={formAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby="video-approve-title"
              >
                <input
                  type="hidden"
                  name="confirmation"
                  value="APPROVE_VIDEO"
                />
                <span className="studio-eyebrow">FINAL VIDEO REVIEW</span>
                <h3 id="video-approve-title">Approve this finished video?</h3>
                <p>
                  Confirm that the visuals, narration, and captions are ready.
                  Approval unlocks the downloadable MP4 for publishing.
                </p>
                <div className="video-approval-summary">
                  <span>✓</span>
                  <p>
                    <strong>Your source work remains safe</strong>
                    This does not publish the video or change the approved
                    storyboard.
                  </p>
                </div>
                {state.message ? (
                  <p className="project-dialog-error" role="alert">
                    {state.message}
                  </p>
                ) : null}
                <footer>
                  <button
                    className="project-dialog-cancel"
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirming(false)}
                  >
                    Continue reviewing
                  </button>
                  <button
                    className="project-dialog-confirm"
                    type="submit"
                    disabled={pending}
                  >
                    {pending ? "Approving…" : "Approve video"}
                  </button>
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
