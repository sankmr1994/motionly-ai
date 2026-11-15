"use client";

import type { ProjectStatus } from "@motionly/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  archiveProjectAction,
  deleteProjectAction,
  renameProjectAction,
} from "../app/dashboard/actions";
import { StudioIcon } from "./studio-icon";

type Dialog = "rename" | "delete" | null;

export function ProjectActions({
  archived,
  canDelete,
  projectId,
  status,
  title,
}: {
  archived: boolean;
  canDelete: boolean;
  projectId: string;
  status: ProjectStatus;
  title: string;
}) {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [nextTitle, setNextTitle] = useState(title);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !actionsRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    setMenuOpen(false);
    startTransition(async () => {
      finish(await archiveProjectAction(projectId, !archived));
    });
  }

  return (
    <div className="project-actions" ref={actionsRef}>
      <button
        ref={triggerRef}
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
          {!archived && status === "DRAFT" ? (
            <Link
              role="menuitem"
              href={`/dashboard/create?projectId=${projectId}`}
              onClick={() => setMenuOpen(false)}
            >
              <StudioIcon name="edit" />
              Edit draft
            </Link>
          ) : null}
          {!archived && (status === "REVIEW_READY" || status === "APPROVED") ? (
            <Link
              role="menuitem"
              href={`/dashboard/projects/${projectId}/storyboard`}
              onClick={() => setMenuOpen(false)}
            >
              <StudioIcon name="projects" />
              {status === "APPROVED" ? "View storyboard" : "Review storyboard"}
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
          {status !== "PLANNING" ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={archiveOrRestore}
            >
              <StudioIcon name={archived ? "restore" : "archive"} />
              {archived ? "Restore" : "Archive"}
            </button>
          ) : null}
          {canDelete ? (
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
              Delete project
            </button>
          ) : null}
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
                <h3 id="project-delete-title">Delete this project?</h3>
                <p>
                  “{title}” and all its saved revisions, narration, captions,
                  and generated videos will be permanently removed. This cannot
                  be undone.
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
                        : await deleteProjectAction(projectId),
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
