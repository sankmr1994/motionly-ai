import { getProjectPlan, listProjectStoryboardRevisions } from "@motionly/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryboardActionButton } from "../../../../../components/storyboard-action-button";
import { StoryboardEditor } from "../../../../../components/storyboard-editor";
import { StoryboardReferenceEditor } from "../../../../../components/storyboard-reference-editor";
import { StoryboardRevisionHistory } from "../../../../../components/storyboard-revision-history";
import { StudioIcon } from "../../../../../components/studio-icon";
import { StudioShell } from "../../../../../components/studio-shell";
import { requireStudioSession } from "../../../../../lib/studio-session";

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function referenceHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Reference webpage";
  }
}

export default async function StoryboardReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    approved?: string;
    selected?: string;
    edited?: string;
    referenceChanged?: string;
    combined?: string;
  }>;
}) {
  const { session } = await requireStudioSession();
  const { projectId } = await params;
  const { approved, selected, edited, referenceChanged, combined } =
    await searchParams;
  const [plan, revisions] = await Promise.all([
    getProjectPlan(session.user.id, projectId),
    listProjectStoryboardRevisions(session.user.id, projectId),
  ]);
  if (!plan) notFound();
  const totalDuration = plan.storyboard.scenes.reduce(
    (total, scene) => total + scene.durationEstimateSeconds,
    0,
  );

  return (
    <StudioShell
      active="videos"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {approved === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Storyboard approved</strong>
            <p>This exact revision is locked for the future generation step.</p>
          </div>
        </div>
      ) : null}
      {selected === "1" ? (
        <div className="studio-success" role="status">
          <span>↺</span>
          <div>
            <strong>Current storyboard changed</strong>
            <p>
              The selected revision is now current. No duplicate was created.
            </p>
          </div>
        </div>
      ) : null}
      {edited === "1" ? (
        <div className="studio-success" role="status">
          <span>✎</span>
          <div>
            <strong>Edited revision created</strong>
            <p>Review every scene before approving this new revision.</p>
          </div>
        </div>
      ) : null}
      {referenceChanged === "1" ? (
        <div className="studio-success" role="status">
          <span>↗</span>
          <div>
            <strong>Reference updated</strong>
            <p>
              The new source passed relevance checks and created Revision{" "}
              {plan.revision}. Your earlier revision remains saved.
            </p>
          </div>
        </div>
      ) : null}
      {combined === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Reference and edits saved together</strong>
            <p>
              Revision {plan.revision} contains the regenerated source-grounded
              plan and your compatible scene changes. Only one revision was
              created.
            </p>
          </div>
        </div>
      ) : null}

      <div className="studio-breadcrumbs">
        <Link href="/dashboard">My Videos</Link>
        <span>/</span>
        <strong>Review Storyboard</strong>
      </div>

      <section className="storyboard-review-heading">
        <div>
          <span className="studio-eyebrow">
            AI VIDEO PLAN · REVISION {plan.revision}
          </span>
          <h1>Review your storyboard</h1>
          <p>
            Read every scene before approval. Nothing is narrated or rendered
            until you approve this plan.
          </p>
        </div>
        <span
          className={`storyboard-review-status ${plan.approvalStatus.toLowerCase()}`}
        >
          {humanize(plan.approvalStatus)}
        </span>
      </section>

      <section
        className="storyboard-command-bar"
        aria-label="Storyboard actions"
      >
        <div>
          <span className="studio-eyebrow">CURRENT REVIEW COPY</span>
          <strong>Revision {plan.revision}</strong>
          <small>
            {revisions.length} saved revision{revisions.length === 1 ? "" : "s"}
          </small>
        </div>
        <div className="storyboard-command-actions">
          {plan.approvalStatus === "REVIEW_READY" ? (
            <>
              <StoryboardEditor
                projectId={projectId}
                versionId={plan.versionId}
                contentHash={plan.contentHash}
                revision={plan.revision}
                nextRevision={plan.nextRevision}
                scenes={plan.storyboard.scenes}
                currentReference={plan.references[0]?.url}
              />
              <StoryboardActionButton
                mode="approve"
                projectId={projectId}
                versionId={plan.versionId}
                contentHash={plan.contentHash}
                revision={plan.revision}
                nextRevision={plan.nextRevision}
              />
            </>
          ) : null}
          <StoryboardRevisionHistory
            projectId={projectId}
            revisions={revisions}
            currentRevision={plan.revision}
            canSwitch={plan.project.status === "REVIEW_READY"}
          />
          {plan.approvalStatus === "REVIEW_READY" ? (
            <details className="storyboard-more-actions">
              <summary>More</summary>
              <div>
                <StoryboardActionButton
                  mode="regenerate"
                  projectId={projectId}
                  variant="secondary"
                  revision={plan.revision}
                  nextRevision={plan.nextRevision}
                />
              </div>
            </details>
          ) : null}
        </div>
      </section>

      <div className="storyboard-review-layout">
        <main className="storyboard-scenes">
          <section className="storyboard-source-notice">
            <StudioIcon name="sparkles" />
            <div>
              <strong>
                {plan.references.length
                  ? "Reference-grounded plan"
                  : "AI-generated plan"}
              </strong>
              {plan.references.length ? (
                <p>
                  Motionly successfully read your trusted reference while
                  creating this storyboard. Review the source and every scene
                  before approval.
                </p>
              ) : (
                <p>
                  No reference was provided. Verify factual claims before
                  approval.
                </p>
              )}
            </div>
          </section>

          {plan.storyboard.scenes.map((scene, index) => (
            <article className="storyboard-scene-card" key={scene.id}>
              <header>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <small>{humanize(scene.template)}</small>
                  <strong>{scene.durationEstimateSeconds}s</strong>
                </div>
              </header>
              <div className="storyboard-scene-content">
                <span className="studio-eyebrow">SCENE {index + 1}</span>
                <h2>{scene.title ?? `Scene ${index + 1}`}</h2>
                <blockquote>{scene.narration}</blockquote>
                <section>
                  <h3>Visual direction</h3>
                  <div className="storyboard-object-list">
                    {scene.objects.map((object) => (
                      <span key={object}>{humanize(object)}</span>
                    ))}
                  </div>
                </section>
                <section>
                  <h3>Motion plan</h3>
                  <ol className="storyboard-motion-list">
                    {scene.actions.map((action, actionIndex) => (
                      <li key={`${scene.id}-${actionIndex}`}>
                        <b>{humanize(action.type)}</b>
                        <span>
                          {"target" in action
                            ? humanize(action.target)
                            : action.targets.map(humanize).join(", ")}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </article>
          ))}
        </main>

        <aside className="storyboard-review-sidebar">
          <section>
            <span className="studio-eyebrow">PLAN SUMMARY</span>
            <h2>{plan.project.title}</h2>
            <dl>
              <div>
                <dt>Scenes</dt>
                <dd>{plan.storyboard.scenes.length}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{totalDuration} seconds</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>9:16 Vertical</dd>
              </div>
              <div>
                <dt>Generated with</dt>
                <dd>{plan.generatedBy.model}</dd>
              </div>
            </dl>
          </section>

          <section className="storyboard-references">
            <span className="studio-eyebrow">TRUSTED REFERENCE</span>
            <h2>
              {plan.references.length ? "Source used" : "No source added"}
            </h2>
            {plan.references.length ? (
              <p>
                This public webpage was available to the AI while it wrote the
                storyboard.
              </p>
            ) : (
              <p>
                Add a trusted webpage to regenerate this storyboard with
                source-grounded facts.
              </p>
            )}
            {plan.references.length
              ? plan.references.map(({ url }) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <span>↗</span>
                    <span>
                      <strong>{referenceHost(url)}</strong>
                      <small>{url}</small>
                    </span>
                  </a>
                ))
              : null}
            {plan.approvalStatus === "REVIEW_READY" ? (
              <StoryboardReferenceEditor
                projectId={projectId}
                versionId={plan.versionId}
                currentReference={plan.references[0]?.url}
                revision={plan.revision}
                nextRevision={plan.nextRevision}
              />
            ) : null}
          </section>

          {plan.approvalStatus === "APPROVED" ? (
            <div className="storyboard-approved-note">
              <span>✓</span>
              <div>
                <strong>Approved revision</strong>
                <p>Ready for the future narration and rendering phase.</p>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </StudioShell>
  );
}
