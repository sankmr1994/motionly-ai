"use client";

import { useActionState, useState } from "react";
import { createPortal } from "react-dom";
import {
  changeStoryboardReferenceAction,
  type StoryboardActionState,
} from "../app/dashboard/projects/actions";

const initialState: StoryboardActionState = {};

export function StoryboardReferenceEditor({
  projectId,
  versionId,
  currentReference,
  revision,
  nextRevision,
}: {
  projectId: string;
  versionId: string;
  currentReference?: string;
  revision: number;
  nextRevision: number;
}) {
  const [open, setOpen] = useState(false);
  const action = changeStoryboardReferenceAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <button
        className="storyboard-reference-change"
        type="button"
        onClick={() => setOpen(true)}
      >
        {currentReference ? "Change reference" : "Add reference"}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="project-dialog-backdrop">
              <form
                className="project-dialog storyboard-reference-dialog"
                action={formAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby="storyboard-reference-title"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !pending) setOpen(false);
                }}
              >
                <input
                  type="hidden"
                  name="basedOnVersionId"
                  value={versionId}
                />
                <input
                  type="hidden"
                  name="confirmation"
                  value="CHANGE_REFERENCE"
                />
                <span className="studio-eyebrow">TRUSTED REFERENCE</span>
                <h3 id="storyboard-reference-title">
                  {currentReference
                    ? "Change the reference webpage?"
                    : "Add a reference webpage?"}
                </h3>
                <p>
                  Motionly will verify the new page, check that it matches your
                  idea, and regenerate the complete storyboard. Revision{" "}
                  {revision}
                  remains safely saved.
                </p>
                <label htmlFor="storyboard-reference-url">
                  Public HTTPS webpage
                </label>
                <input
                  autoFocus
                  id="storyboard-reference-url"
                  name="referenceUrl"
                  type="url"
                  inputMode="url"
                  maxLength={2048}
                  defaultValue={currentReference}
                  placeholder="https://example.org/trusted-article"
                  required
                />
                <div className="storyboard-reference-flow">
                  <span>{revision}</span>
                  <b aria-hidden="true">→</b>
                  <span>{nextRevision}</span>
                  <p>
                    Current revision stays saved. The grounded result becomes
                    the new review copy only after every check passes.
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
                    onClick={() => setOpen(false)}
                  >
                    Keep current reference
                  </button>
                  <button
                    className="project-dialog-confirm"
                    type="submit"
                    disabled={pending}
                  >
                    {pending
                      ? "Checking and regenerating…"
                      : `Create Revision ${nextRevision}`}
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
