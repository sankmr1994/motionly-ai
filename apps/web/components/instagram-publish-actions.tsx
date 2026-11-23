"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import {
  publishInstagramAction,
  type VideoActionState,
} from "../app/dashboard/projects/video-actions";

const initialState: VideoActionState = {};

export function InstagramPublishActions({
  projectId,
  jobId,
  title,
  username,
}: {
  projectId: string;
  jobId: string;
  title: string;
  username?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const action = publishInstagramAction.bind(null, projectId, jobId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const defaultCaption = `${title}\n\n#Motionly #LearnOnInstagram`;

  return (
    <>
      <button
        className="instagram-publish-button"
        type="button"
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        ◎ Publish to Instagram
      </button>
      {state.message && !confirming ? (
        <p className="video-action-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {confirming && typeof document !== "undefined"
        ? createPortal(
            <div className="project-dialog-backdrop">
              <form
                className="project-dialog instagram-publish-dialog"
                action={formAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby="instagram-publish-title"
              >
                <input
                  type="hidden"
                  name="confirmation"
                  value="PUBLISH_INSTAGRAM"
                />
                <span className="studio-eyebrow">
                  MANUAL INSTAGRAM PUBLISHING
                </span>
                <h3 id="instagram-publish-title">Publish this Reel?</h3>
                <p>
                  Motionly will send this approved video to
                  {username
                    ? ` @${username}`
                    : " your connected Instagram account"}
                  . This action creates a real Instagram Reel.
                </p>
                <label htmlFor="instagram-caption">Caption</label>
                <textarea
                  id="instagram-caption"
                  name="caption"
                  maxLength={2200}
                  defaultValue={defaultCaption}
                  required
                />
                <label className="instagram-feed-choice">
                  <input type="checkbox" name="shareToFeed" defaultChecked />
                  <span>
                    <strong>Also show in your Instagram feed</strong>
                    Recommended for better visibility.
                  </span>
                </label>
                <div className="instagram-publish-summary">
                  <span>✓</span>
                  <p>
                    <strong>No duplicate publishing</strong>
                    Motionly keeps the approved MP4 safe and prevents repeated
                    submissions while Instagram is processing it.
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
                    Cancel
                  </button>
                  <button
                    className="project-dialog-confirm"
                    type="submit"
                    disabled={pending}
                  >
                    {pending ? "Publishing…" : "Publish Reel"}
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
