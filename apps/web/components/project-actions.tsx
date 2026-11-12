"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  archiveProjectAction,
  deleteDraftProjectAction,
  renameProjectAction,
} from "../app/dashboard/actions";
import { StudioIcon } from "./studio-icon";

type Dialog = "rename" | "delete" | null;

export function ProjectActions({
  archived,
  projectId,
  title,
}: {
  archived: boolean;
  projectId: string;
  title: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [nextTitle, setNextTitle] = useState(title);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function finish(result: { ok: boolean; message: string }) {
    setMessage(result.ok ? "" : result.message);
    if (result.ok) {
      setDialog(null);
      setMenuOpen(false);
      router.refresh();
    }
  }

  function archiveOrRestore() {
    setMessage("");
    startTransition(async () => {
      finish(await archiveProjectAction(projectId, !archived));
    });
  }

  return (
    <div className="project-actions">
      <button
        className="project-actions-trigger"
        type="button"
        aria-label={`Actions for ${title}`}
        aria-expanded={menuOpen}
        onClick={() => {
          setMessage("");
          setMenuOpen((open) => !open);
        }}
      >
        <StudioIcon name="more" />
      </button>

      {menuOpen ? (
        <div className="project-actions-menu" role="menu">
          {!archived ? (
            <Link
              role="menuitem"
              href={`/dashboard/create?projectId=${projectId}`}
            >
              <StudioIcon name="edit" />
              Edit draft
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setNextTitle(title);
              setDialog("rename");
              setMenuOpen(false);
            }}
          >
            <StudioIcon name="projects" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            onClick={archiveOrRestore}
          >
            <StudioIcon name={archived ? "restore" : "archive"} />
            {archived ? "Restore" : "Archive"}
          </button>
          <button
            className="danger"
            type="button"
            role="menuitem"
            onClick={() => {
              setDialog("delete");
              setMenuOpen(false);
            }}
          >
            <StudioIcon name="trash" />
            Delete draft
          </button>
        </div>
      ) : null}

      {message && !dialog ? (
        <span className="project-action-inline-error" role="alert">
          {message}
        </span>
      ) : null}

      {dialog ? (
        <div className="project-dialog-backdrop">
          <section
            className="project-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`project-${dialog}-title`}
          >
            {dialog === "rename" ? (
              <>
                <span className="studio-eyebrow">EDIT PROJECT</span>
                <h3 id="project-rename-title">Rename your draft</h3>
                <p>Choose a short title that will be easy to find later.</p>
                <label>
                  Project title
                  <input
                    autoFocus
                    value={nextTitle}
                    maxLength={120}
                    onChange={(event) => setNextTitle(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <span className="studio-eyebrow danger">PERMANENT ACTION</span>
                <h3 id="project-delete-title">Delete this draft?</h3>
                <p>
                  “{title}” and its saved draft content will be permanently
                  removed. This cannot be undone.
                </p>
              </>
            )}

            {message ? (
              <p className="project-dialog-error" role="alert">
                {message}
              </p>
            ) : null}
            <footer>
              <button
                className="project-dialog-cancel"
                type="button"
                disabled={pending}
                onClick={() => {
                  setMessage("");
                  setDialog(null);
                }}
              >
                Cancel
              </button>
              <button
                className={
                  dialog === "delete"
                    ? "project-dialog-confirm danger"
                    : "project-dialog-confirm"
                }
                type="button"
                disabled={pending || (dialog === "rename" && !nextTitle.trim())}
                onClick={() => {
                  setMessage("");
                  startTransition(async () => {
                    finish(
                      dialog === "rename"
                        ? await renameProjectAction(projectId, nextTitle)
                        : await deleteDraftProjectAction(projectId),
                    );
                  });
                }}
              >
                {pending
                  ? "Working…"
                  : dialog === "rename"
                    ? "Save title"
                    : "Delete permanently"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
