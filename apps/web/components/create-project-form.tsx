"use client";

import { useActionState, useState } from "react";
import {
  saveProjectDraft,
  type DraftActionState,
} from "../app/dashboard/create/actions";
import { StudioIcon } from "./studio-icon";

const initialState: DraftActionState = {};

type EditableDraft = {
  id: string;
  inputMode: "TOPIC" | "SCRIPT";
  content: string;
  referenceUrl?: string;
  duration: 30 | 45 | 60;
};

export function CreateProjectForm({ draft }: { draft?: EditableDraft }) {
  const [mode, setMode] = useState<"TOPIC" | "SCRIPT">(
    draft?.inputMode ?? "TOPIC",
  );
  const [duration, setDuration] = useState<number>(draft?.duration ?? 45);
  const [content, setContent] = useState(draft?.content ?? "");
  const [referenceUrl, setReferenceUrl] = useState(draft?.referenceUrl ?? "");
  const [showReference, setShowReference] = useState(
    Boolean(draft?.referenceUrl),
  );
  const [state, action, pending] = useActionState(
    saveProjectDraft,
    initialState,
  );
  const contentError =
    state.fieldErrors?.topic?.[0] ?? state.fieldErrors?.sourceScript?.[0];
  const referenceError = state.fieldErrors?.references?.[0];

  return (
    <form className="create-project-form" action={action}>
      <input type="hidden" name="inputMode" value={mode} />
      <input type="hidden" name="duration" value={duration} />
      {draft ? <input type="hidden" name="projectId" value={draft.id} /> : null}

      <section className="create-input-panel">
        <div className="create-mode-tabs" aria-label="Choose input type">
          <button
            className={mode === "TOPIC" ? "active" : ""}
            type="button"
            onClick={() => setMode("TOPIC")}
          >
            <StudioIcon name="bulb" />
            Idea
          </button>
          <button
            className={mode === "SCRIPT" ? "active" : ""}
            type="button"
            onClick={() => setMode("SCRIPT")}
          >
            <StudioIcon name="script" />
            Full script
          </button>
        </div>

        <label className="create-text-label" htmlFor="project-content">
          <span>
            {mode === "TOPIC"
              ? "Describe your video idea"
              : "Paste your narration script"}
          </span>
          <small>
            {mode === "TOPIC"
              ? "One clear sentence is enough"
              : "Up to 5,000 characters"}
          </small>
        </label>
        <textarea
          id="project-content"
          name="content"
          minLength={mode === "TOPIC" ? 3 : 1}
          maxLength={mode === "TOPIC" ? 500 : 5000}
          placeholder={
            mode === "TOPIC"
              ? "Example: Explain how habit loops work by breaking down cues, routines, and rewards."
              : "Paste the exact words you want the narrator to say…"
          }
          aria-describedby="content-help content-error"
          aria-invalid={Boolean(contentError)}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
        />
        <p id="content-help" className="create-help">
          <StudioIcon name="sparkles" />
          {mode === "TOPIC"
            ? "Start simply—you can review every scene before a video is generated."
            : "Motionly will preserve your words and create visuals around them."}
        </p>
        {contentError ? (
          <p id="content-error" className="create-error">
            {contentError}
          </p>
        ) : null}

        <section className="create-reference">
          {!showReference ? (
            <button
              type="button"
              className="create-reference-trigger"
              onClick={() => setShowReference(true)}
            >
              <span>+</span>
              <span>
                <strong>Add a trusted reference</strong>
                <small>
                  Optional · helps Motionly follow a specific webpage
                </small>
              </span>
            </button>
          ) : (
            <div className="create-reference-field">
              <div>
                <label htmlFor="reference-url">Trusted reference</label>
                <button
                  type="button"
                  onClick={() => {
                    setReferenceUrl("");
                    setShowReference(false);
                  }}
                >
                  Remove
                </button>
              </div>
              <input
                id="reference-url"
                name="referenceUrl"
                type="url"
                inputMode="url"
                maxLength={2048}
                placeholder="https://example.org/trusted-article"
                value={referenceUrl}
                onChange={(event) => setReferenceUrl(event.target.value)}
                aria-describedby="reference-help reference-error"
                aria-invalid={Boolean(referenceError)}
                required
              />
              <p id="reference-help">
                Motionly will read this public HTTPS page and use it when
                writing factual claims. You can review the source with the
                storyboard.
              </p>
              {referenceError ? (
                <p id="reference-error" className="create-error">
                  {referenceError}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <div className="prompt-guidance">
          <span>PROMPT HELPERS</span>
          <div>
            <button
              type="button"
              onClick={() => {
                setMode("TOPIC");
                setContent(
                  "Explain compound interest to a first-time investor with a simple real-world example.",
                );
              }}
            >
              Teach a beginner
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("TOPIC");
                setContent(
                  "Show how binary search finds a number, step by step.",
                );
              }}
            >
              Explain step-by-step
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("TOPIC");
                setContent(
                  "Explain how habit loops form in a warm, beginner-friendly way.",
                );
              }}
            >
              Keep it warm &amp; clear
            </button>
          </div>
        </div>
      </section>

      <aside className="video-defaults-panel">
        <header>
          <div>
            <span>Video defaults</span>
            <p>Simple settings for your first draft</p>
          </div>
          <StudioIcon name="settings" />
        </header>

        <fieldset>
          <legend>Where will you post it?</legend>
          <div className="format-option selected">
            <span className="format-icon">
              <StudioIcon name="video" />
            </span>
            <span>
              <strong>Instagram Reel</strong>
              <small>9:16 Vertical</small>
            </span>
            <i>✓</i>
          </div>
        </fieldset>

        <fieldset>
          <legend>Recommended duration</legend>
          <div className="duration-options">
            {[30, 45, 60].map((seconds) => (
              <button
                className={duration === seconds ? "active" : ""}
                type="button"
                key={seconds}
                onClick={() => setDuration(seconds)}
                aria-pressed={duration === seconds}
              >
                {seconds}s
              </button>
            ))}
          </div>
          <small className="field-note">
            45 seconds works well for most explainers.
          </small>
        </fieldset>

        <fieldset>
          <legend>Narration voice</legend>
          <div className="voice-option">
            <span>AD</span>
            <div>
              <strong>Aditi — Indian English</strong>
              <small>Clear, warm &amp; natural</small>
            </div>
          </div>
        </fieldset>

        <div className="caption-option">
          <span>✓</span>
          <div>
            <strong>Auto-synced captions</strong>
            <small>Highlight spoken words automatically</small>
          </div>
        </div>
      </aside>

      <footer className="create-form-footer">
        <div>
          <StudioIcon name="projects" />
          <span>
            <strong>{draft ? "Update this draft" : "Save as a draft"}</strong>
            <small>Your idea stays private in your workspace.</small>
          </span>
        </div>
        {state.message ? (
          <p role="alert" className="create-error form-error">
            {state.message}
          </p>
        ) : null}
        <button className="studio-primary-button" disabled={pending}>
          {pending
            ? draft
              ? "Updating your draft…"
              : "Saving your draft…"
            : draft
              ? "Update draft"
              : "Save draft"}
          {!pending ? <StudioIcon name="arrow" /> : null}
        </button>
      </footer>
    </form>
  );
}
