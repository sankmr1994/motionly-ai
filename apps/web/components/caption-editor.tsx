"use client";

import { findActiveCaptionCue, type CaptionStyle } from "@motionly/shared";
import { useActionState, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  captionReviewAction,
  type CaptionActionState,
} from "../app/dashboard/projects/caption-actions";

type CaptionEditorScene = {
  sceneId: string;
  title: string;
  audioUrl: string;
  audioDurationSeconds: number;
  plannedDurationSeconds: number;
  timingDeltaSeconds: number;
  fit: "FITS" | "OVERRUN";
  cues: Array<{
    id: string;
    startSeconds: number;
    endSeconds: number;
    text: string;
  }>;
};

const styles: Array<{
  value: CaptionStyle;
  label: string;
  description: string;
}> = [
  {
    value: "MINIMAL",
    label: "Minimal",
    description: "Clean white captions with a subtle dark plate.",
  },
  {
    value: "KARAOKE",
    label: "Word focus",
    description: "Cobalt captions with a stable chartreuse highlight.",
  },
  {
    value: "BOLD",
    label: "Social bold",
    description: "High-contrast uppercase captions for fast feeds.",
  },
];

const initialState: CaptionActionState = {};

export function CaptionEditor({
  projectId,
  jobId,
  version,
  status,
  initialStyle,
  scenes,
}: {
  projectId: string;
  jobId: string;
  version: number;
  status: "DRAFT" | "APPROVED";
  initialStyle: CaptionStyle;
  scenes: CaptionEditorScene[];
}) {
  const [style, setStyle] = useState(initialStyle);
  const [cueText, setCueText] = useState(() =>
    Object.fromEntries(
      scenes.flatMap((scene) =>
        scene.cues.map((cue) => [cue.id, cue.text] as const),
      ),
    ),
  );
  const [currentTimes, setCurrentTimes] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const action = captionReviewAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const readOnly = status === "APPROVED";
  const serializedCues = useMemo(
    () =>
      JSON.stringify(
        scenes.flatMap((scene) =>
          scene.cues.map((cue) => ({
            id: cue.id,
            text: cueText[cue.id] ?? cue.text,
          })),
        ),
      ),
    [cueText, scenes],
  );

  return (
    <form className="caption-editor" action={formAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="style" value={style} />
      <input type="hidden" name="cues" value={serializedCues} />

      <section className="caption-style-panel">
        <div>
          <span className="studio-eyebrow">CAPTION STYLE</span>
          <h2>Choose one consistent look</h2>
          <p>
            Every option keeps a fixed font size and smooth opacity transition,
            so captions never jump or resize between phrases.
          </p>
        </div>
        <div className="caption-style-options">
          {styles.map((option) => (
            <label
              className={style === option.value ? "selected" : ""}
              key={option.value}
            >
              <input
                type="radio"
                name="captionStyleChoice"
                value={option.value}
                checked={style === option.value}
                disabled={readOnly || pending}
                onChange={() => setStyle(option.value)}
              />
              <span
                className={`caption-style-sample ${option.value.toLowerCase()}`}
              >
                Clear ideas, timed perfectly
              </span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </label>
          ))}
        </div>
      </section>

      <div className="caption-scene-list">
        {scenes.map((scene, sceneIndex) => {
          const currentTime = currentTimes[scene.sceneId] ?? 0;
          const activeCue = findActiveCaptionCue(scene.cues, currentTime);
          return (
            <article className="caption-scene-card" key={scene.sceneId}>
              <header>
                <span>{String(sceneIndex + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{scene.title}</strong>
                  <small>
                    {scene.cues.length} caption
                    {scene.cues.length === 1 ? "" : "s"}
                  </small>
                </div>
                <span className={`caption-fit ${scene.fit.toLowerCase()}`}>
                  {scene.fit === "FITS"
                    ? "Timing fits"
                    : `Over by ${scene.timingDeltaSeconds.toFixed(1)}s`}
                </span>
              </header>

              <div className="caption-preview-grid">
                <div className={`caption-phone-preview ${style.toLowerCase()}`}>
                  <span>SCENE {sceneIndex + 1}</span>
                  <div>
                    {activeCue
                      ? (cueText[activeCue.id] ?? activeCue.text)
                      : currentTime === 0
                        ? "Play the audio to preview captions"
                        : ""}
                  </div>
                </div>
                <div className="caption-scene-controls">
                  <dl>
                    <div>
                      <dt>Planned scene</dt>
                      <dd>{scene.plannedDurationSeconds.toFixed(1)}s</dd>
                    </div>
                    <div>
                      <dt>Actual audio</dt>
                      <dd>{scene.audioDurationSeconds.toFixed(1)}s</dd>
                    </div>
                  </dl>
                  <audio
                    controls
                    preload="metadata"
                    src={scene.audioUrl}
                    ref={(element) => {
                      audioRefs.current[scene.sceneId] = element;
                    }}
                    onPlay={() => {
                      Object.entries(audioRefs.current).forEach(
                        ([sceneId, audio]) => {
                          if (sceneId !== scene.sceneId) audio?.pause();
                        },
                      );
                    }}
                    onTimeUpdate={(event) => {
                      const currentTime = event.currentTarget.currentTime;
                      setCurrentTimes((current) => ({
                        ...current,
                        [scene.sceneId]: currentTime,
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="caption-cue-list">
                {scene.cues.map((cue, cueIndex) => (
                  <label key={cue.id}>
                    <span>{String(cueIndex + 1).padStart(2, "0")}</span>
                    <small>
                      {cue.startSeconds.toFixed(1)}–{cue.endSeconds.toFixed(1)}s
                    </small>
                    <textarea
                      rows={2}
                      maxLength={80}
                      value={cueText[cue.id] ?? cue.text}
                      disabled={readOnly || pending}
                      aria-label={`Scene ${sceneIndex + 1}, caption ${cueIndex + 1}`}
                      onChange={(event) => {
                        setCueText((current) => ({
                          ...current,
                          [cue.id]: event.target.value,
                        }));
                      }}
                    />
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {state.message ? (
        <p className="caption-action-error" role="alert">
          {state.message}
        </p>
      ) : null}

      {readOnly ? (
        <div className="caption-approved-lock">
          <span>✓</span>
          <p>
            <strong>Captions approved</strong>
            This synchronized caption timeline is locked for video rendering.
          </p>
        </div>
      ) : (
        <footer className="caption-editor-actions">
          <p>
            Saving keeps captions editable. Approval locks the wording, style,
            and protected audio timing.
          </p>
          <button name="intent" value="save" disabled={pending}>
            {pending ? "Saving…" : "Save captions"}
          </button>
          <button
            className="primary"
            type="button"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            Approve captions
          </button>
        </footer>
      )}

      {confirming && typeof document !== "undefined"
        ? createPortal(
            <div className="project-dialog-backdrop">
              <form
                className="project-dialog caption-approve-dialog"
                action={formAction}
                role="dialog"
                aria-modal="true"
                aria-labelledby="caption-approve-title"
              >
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="version" value={version} />
                <input type="hidden" name="style" value={style} />
                <input type="hidden" name="cues" value={serializedCues} />
                <input type="hidden" name="intent" value="approve" />
                <span className="studio-eyebrow">FINAL CAPTION REVIEW</span>
                <h3 id="caption-approve-title">Approve these captions?</h3>
                <p>
                  Motionly will lock the current wording, caption style, and
                  synchronized timing for the video renderer.
                </p>
                <div className="caption-approval-summary">
                  <span>✓</span>
                  <p>
                    <strong>Audio timing stays protected</strong>
                    Approval does not regenerate narration or create another
                    storyboard revision.
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
                    {pending ? "Approving…" : "Approve captions"}
                  </button>
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}
    </form>
  );
}
