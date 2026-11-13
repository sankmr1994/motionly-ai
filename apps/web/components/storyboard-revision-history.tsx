"use client";

import type { ProjectStoryboardRevision } from "@motionly/db";
import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  makeStoryboardRevisionCurrentAction,
  type StoryboardActionState,
} from "../app/dashboard/projects/actions";

const initialState: StoryboardActionState = {};
const revisionsPerPage = 5;

export function StoryboardRevisionHistory({
  projectId,
  revisions,
  currentRevision,
  canSwitch,
}: {
  projectId: string;
  revisions: ProjectStoryboardRevision[];
  currentRevision: number;
  canSwitch: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ProjectStoryboardRevision | null>(
    null,
  );
  const action = makeStoryboardRevisionCurrentAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const totalPages = Math.max(
    1,
    Math.ceil(revisions.length / revisionsPerPage),
  );
  const visibleRevisions = revisions.slice(
    page * revisionsPerPage,
    page * revisionsPerPage + revisionsPerPage,
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function openHistory() {
    setPage(0);
    setOpen(true);
  }

  return (
    <>
      <button
        className="storyboard-history-trigger"
        type="button"
        aria-haspopup="dialog"
        onClick={openHistory}
      >
        <span className="storyboard-history-trigger-icon" aria-hidden="true">
          ↺
        </span>
        <span>
          <small>REVISION HISTORY</small>
          <strong>View saved storyboards</strong>
          <span>Review or switch to an earlier plan</span>
        </span>
        <b>{revisions.length}</b>
        <span className="storyboard-history-trigger-arrow" aria-hidden="true">
          →
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="storyboard-history-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !pending)
                  setOpen(false);
              }}
            >
              <section
                className="storyboard-history-drawer"
                role="dialog"
                aria-modal="true"
                aria-labelledby="storyboard-history-title"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !pending && !selected) {
                    setOpen(false);
                  }
                }}
              >
                <header className="storyboard-history-drawer-header">
                  <div>
                    <span className="studio-eyebrow">REVISION HISTORY</span>
                    <h2 id="storyboard-history-title">Saved storyboards</h2>
                    <p>
                      Every plan stays safe when you regenerate or switch a
                      revision.
                    </p>
                  </div>
                  <button
                    autoFocus
                    type="button"
                    aria-label="Close revision history"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </header>

                <div className="storyboard-history-page-summary">
                  <span>
                    <b>{revisions.length}</b> saved revision
                    {revisions.length === 1 ? "" : "s"}
                  </span>
                  <span>Newest first</span>
                </div>

                <ol className="storyboard-history-list">
                  {visibleRevisions.map((revision) => (
                    <li
                      key={revision.versionId}
                      className={revision.isCurrent ? "is-current" : undefined}
                    >
                      <div className="storyboard-history-revision-details">
                        <strong>Revision {revision.revision}</strong>
                        <span>
                          {revision.sceneCount} scenes ·{" "}
                          {revision.durationSeconds}s
                        </span>
                        <small>{revision.model}</small>
                      </div>
                      {revision.isCurrent ? (
                        <span className="storyboard-history-current">
                          Current
                        </span>
                      ) : !canSwitch ? (
                        <span className="storyboard-history-locked">
                          Locked
                        </span>
                      ) : (
                        <button
                          className="storyboard-history-switch"
                          type="button"
                          onClick={() => setSelected(revision)}
                        >
                          Make current
                        </button>
                      )}
                    </li>
                  ))}
                </ol>

                {state.message && !selected ? (
                  <p className="storyboard-action-error" role="alert">
                    {state.message}
                  </p>
                ) : null}
                {!canSwitch ? (
                  <p className="storyboard-history-help">
                    Approved storyboards are locked to protect the final plan.
                  </p>
                ) : null}

                <footer className="storyboard-history-pagination">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    ← Previous
                  </button>
                  <span aria-label={`Page ${page + 1} of ${totalPages}`}>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next →
                  </button>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}

      {selected && typeof document !== "undefined"
        ? createPortal(
            <div className="project-dialog-backdrop">
              <form
                className="project-dialog storyboard-switch-dialog"
                action={formAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby="storyboard-switch-title"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !pending) setSelected(null);
                }}
              >
                <input
                  type="hidden"
                  name="versionId"
                  value={selected.versionId}
                />
                <span className="studio-eyebrow">CHANGE CURRENT REVISION</span>
                <h3 id="storyboard-switch-title">
                  Make Revision {selected.revision} current?
                </h3>
                <p>
                  Revision {selected.revision} will become your working
                  storyboard. Revision {currentRevision} will stay safely in
                  history, and no duplicate revision will be created.
                </p>
                <div className="storyboard-switch-flow">
                  <span>Current: Revision {currentRevision}</span>
                  <b>→</b>
                  <span>Revision {selected.revision}</span>
                </div>
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
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="project-dialog-confirm"
                    type="submit"
                    disabled={pending}
                  >
                    {pending
                      ? "Switching revision…"
                      : `Make Revision ${selected.revision} current`}
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
