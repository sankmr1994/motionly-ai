"use client";

import {
  countNarrationWords,
  getNarrationWordLimit,
  type StoryboardScene,
} from "@motionly/shared";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  saveStoryboardEditsAction,
  type StoryboardActionState,
} from "../app/dashboard/projects/actions";

const initialState: StoryboardActionState = {};

type EditableScene = Pick<
  StoryboardScene,
  "id" | "title" | "narration" | "durationEstimateSeconds" | "objects"
>;

export function StoryboardEditor({
  projectId,
  versionId,
  contentHash,
  revision,
  nextRevision,
  scenes,
  currentReference,
}: {
  projectId: string;
  versionId: string;
  contentHash: string;
  revision: number;
  nextRevision: number;
  scenes: EditableScene[];
  currentReference?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [clientMessage, setClientMessage] = useState<string>();
  const [referenceUrl, setReferenceUrl] = useState(currentReference ?? "");
  const [drafts, setDrafts] = useState(() =>
    scenes.map((scene, index) => ({
      ...scene,
      title: scene.title ?? `Scene ${index + 1}`,
    })),
  );
  const action = saveStoryboardEditsAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const referenceChanged =
    referenceUrl.trim() !== (currentReference ?? "").trim();

  const changeSummary = useMemo(() => {
    let titleChanges = 0;
    let narrationChanges = 0;
    let visualLabelChanges = 0;
    const changedScenes = new Set<string>();
    drafts.forEach((draft, index) => {
      const original = scenes[index]!;
      if (draft.title.trim() !== (original.title ?? `Scene ${index + 1}`)) {
        titleChanges += 1;
        changedScenes.add(draft.id);
      }
      if (draft.narration.trim() !== original.narration) {
        narrationChanges += 1;
        changedScenes.add(draft.id);
      }
      draft.objects.forEach((object, objectIndex) => {
        if (object.trim() !== original.objects[objectIndex]) {
          visualLabelChanges += 1;
          changedScenes.add(draft.id);
        }
      });
    });
    return {
      titleChanges,
      narrationChanges,
      visualLabelChanges,
      changedScenes: changedScenes.size,
    };
  }, [drafts, scenes]);

  const timingIssues = drafts.flatMap((scene, index) => {
    if (scene.narration.trim() === scenes[index]!.narration) return [];
    const wordCount = countNarrationWords(scene.narration);
    const maximumWords = getNarrationWordLimit(scene.durationEstimateSeconds);
    return wordCount > maximumWords
      ? [{ sceneId: scene.id, wordCount, maximumWords }]
      : [];
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function openEditor() {
    setDrafts(
      scenes.map((scene, index) => ({
        ...scene,
        title: scene.title ?? `Scene ${index + 1}`,
      })),
    );
    setReviewing(false);
    setClientMessage(undefined);
    setReferenceUrl(currentReference ?? "");
    setOpen(true);
  }

  function reviewChanges() {
    if (!changeSummary.changedScenes && !referenceChanged) {
      setClientMessage("Change at least one scene or replace the reference.");
      return;
    }
    if (referenceChanged && !referenceUrl.trim()) {
      setClientMessage("Enter a public HTTPS reference webpage.");
      return;
    }
    if (timingIssues.length) {
      const first = timingIssues[0]!;
      setClientMessage(
        `${first.sceneId} has ${first.wordCount} words; shorten it to ${first.maximumWords} words or fewer.`,
      );
      return;
    }
    if (
      drafts.some((scene) => !scene.title.trim() || !scene.narration.trim())
    ) {
      setClientMessage("Every scene needs a title and narration.");
      return;
    }
    for (const scene of drafts) {
      if (scene.objects.some((object) => !object.trim())) {
        setClientMessage("Every visual label needs a name.");
        return;
      }
      const normalized = scene.objects.map((object) =>
        object.trim().toLowerCase(),
      );
      if (new Set(normalized).size !== normalized.length) {
        setClientMessage(
          `${scene.id} has duplicate visual labels. Give each label a unique name.`,
        );
        return;
      }
    }
    setClientMessage(undefined);
    setReviewing(true);
  }

  return (
    <>
      <button
        className="storyboard-action-button secondary"
        type="button"
        onClick={openEditor}
      >
        <span aria-hidden="true">✎</span>
        Edit storyboard
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="storyboard-editor-backdrop">
              <form
                className="storyboard-editor-drawer"
                action={formAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby="storyboard-editor-title"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !pending) {
                    reviewing ? setReviewing(false) : setOpen(false);
                  }
                }}
              >
                <input
                  type="hidden"
                  name="basedOnVersionId"
                  value={versionId}
                />
                <input
                  type="hidden"
                  name="expectedContentHash"
                  value={contentHash}
                />
                <input type="hidden" name="confirmation" value="SAVE_EDITS" />
                <input
                  type="hidden"
                  name="referenceChanged"
                  value={String(referenceChanged)}
                />

                <header className="storyboard-editor-header">
                  <div>
                    <span className="studio-eyebrow">
                      EDIT REVISION {revision}
                    </span>
                    <h2 id="storyboard-editor-title">
                      {reviewing ? "Review your changes" : "Edit storyboard"}
                    </h2>
                    <p>
                      {reviewing
                        ? `Saving creates Revision ${nextRevision}. Revision ${revision} remains unchanged.`
                        : "Change titles, narration, and visual labels. Motion and timing stay protected."}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close storyboard editor"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </header>

                <div className="storyboard-editor-scenes" hidden={reviewing}>
                  <section className="storyboard-edit-reference">
                    <div>
                      <span className="studio-eyebrow">TRUSTED REFERENCE</span>
                      <h3>Reference webpage</h3>
                      <p>
                        If you replace this link, Motionly regenerates a
                        temporary candidate, applies your scene edits, and saves
                        everything together as one revision.
                      </p>
                    </div>
                    <label>
                      Public HTTPS webpage
                      <input
                        name="referenceUrl"
                        type="url"
                        inputMode="url"
                        maxLength={2_048}
                        value={referenceUrl}
                        placeholder="https://example.org/trusted-article"
                        onChange={(event) =>
                          setReferenceUrl(event.target.value)
                        }
                      />
                    </label>
                    {referenceChanged ? (
                      <div className="storyboard-edit-reference-notice">
                        <strong>One combined revision</strong>
                        <span>
                          The new source will be checked before your edits are
                          applied. Revision {revision} stays safe if anything
                          fails.
                        </span>
                      </div>
                    ) : null}
                  </section>
                  {drafts.map((scene, index) => {
                    const wordCount = countNarrationWords(scene.narration);
                    const maximumWords = getNarrationWordLimit(
                      scene.durationEstimateSeconds,
                    );
                    const narrationChanged =
                      scene.narration.trim() !== scenes[index]!.narration;
                    return (
                      <section key={scene.id} className="storyboard-edit-scene">
                        <header>
                          <div>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <strong>Scene {index + 1}</strong>
                          </div>
                          <small>{scene.durationEstimateSeconds}s locked</small>
                        </header>
                        <input type="hidden" name="sceneId" value={scene.id} />
                        <input
                          type="hidden"
                          name="objectsJson"
                          value={JSON.stringify(scene.objects)}
                        />
                        <label>
                          Scene title
                          <input
                            name="title"
                            required
                            maxLength={60}
                            value={scene.title}
                            onChange={(event) =>
                              setDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, title: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          Narration
                          <textarea
                            name="narration"
                            required
                            maxLength={1_000}
                            rows={4}
                            value={scene.narration}
                            onChange={(event) =>
                              setDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, narration: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <div
                          className={`storyboard-edit-word-count ${
                            narrationChanged && wordCount > maximumWords
                              ? "over"
                              : ""
                          }`}
                        >
                          <span>
                            {wordCount} / {maximumWords} maximum words
                          </span>
                          <span>
                            {1_000 - scene.narration.length} characters left
                          </span>
                        </div>
                        <fieldset className="storyboard-edit-visuals">
                          <legend>Visual labels</legend>
                          <p>
                            Rename what appears in this scene. Motion references
                            update automatically.
                          </p>
                          <div>
                            {scene.objects.map((object, objectIndex) => (
                              <label key={`${scene.id}-${objectIndex}`}>
                                Label {objectIndex + 1}
                                <input
                                  required
                                  maxLength={80}
                                  value={object}
                                  onChange={(event) =>
                                    setDrafts((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              objects: item.objects.map(
                                                (
                                                  currentObject,
                                                  currentIndex,
                                                ) =>
                                                  currentIndex === objectIndex
                                                    ? event.target.value
                                                    : currentObject,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </section>
                    );
                  })}
                </div>

                <section className="storyboard-edit-review" hidden={!reviewing}>
                  <div>
                    <span>{changeSummary.changedScenes}</span>
                    <p>
                      <strong>Scenes changed</strong>
                      Only these edits will appear in the new revision.
                    </p>
                  </div>
                  <dl>
                    <div>
                      <dt>Scene titles changed</dt>
                      <dd>{changeSummary.titleChanges}</dd>
                    </div>
                    <div>
                      <dt>Narrations changed</dt>
                      <dd>{changeSummary.narrationChanges}</dd>
                    </div>
                    <div>
                      <dt>Visual labels changed</dt>
                      <dd>{changeSummary.visualLabelChanges}</dd>
                    </div>
                    <div>
                      <dt>Timing validation</dt>
                      <dd>Passed</dd>
                    </div>
                    <div>
                      <dt>New revision</dt>
                      <dd>Revision {nextRevision}</dd>
                    </div>
                    <div>
                      <dt>Reference webpage</dt>
                      <dd>
                        {referenceChanged ? "Will be replaced" : "Unchanged"}
                      </dd>
                    </div>
                  </dl>
                  <p>
                    {referenceChanged
                      ? `Motionly will verify the new source, regenerate a temporary candidate, apply these edits, and create only Revision ${nextRevision}.`
                      : `Revision ${revision} will remain available in revision history. The new revision must be reviewed and approved.`}
                  </p>
                </section>

                {(clientMessage || (reviewing && state.message)) && (
                  <p className="storyboard-editor-error" role="alert">
                    {clientMessage ?? (reviewing ? state.message : undefined)}
                  </p>
                )}

                <footer className="storyboard-editor-footer">
                  <button
                    className="project-dialog-cancel"
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      reviewing ? setReviewing(false) : setOpen(false)
                    }
                  >
                    {reviewing ? "Back to editing" : "Cancel"}
                  </button>
                  {reviewing ? (
                    <button
                      className="project-dialog-confirm"
                      type="submit"
                      disabled={pending}
                    >
                      {pending
                        ? referenceChanged
                          ? "Checking source and creating revision…"
                          : "Saving revision…"
                        : `Save as Revision ${nextRevision}`}
                    </button>
                  ) : (
                    <button
                      className="project-dialog-confirm"
                      type="button"
                      onClick={reviewChanges}
                    >
                      Review changes
                    </button>
                  )}
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
