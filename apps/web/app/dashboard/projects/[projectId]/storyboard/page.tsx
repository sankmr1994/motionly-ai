import { getProjectPlan, listProjectStoryboardRevisions } from "@motionly/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryboardActionButton } from "../../../../../components/storyboard-action-button";
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

export default async function StoryboardReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ approved?: string; selected?: string }>;
}) {
  const { session } = await requireStudioSession();
  const { projectId } = await params;
  const { approved, selected } = await searchParams;
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

      <div className="storyboard-review-layout">
        <main className="storyboard-scenes">
          <section className="storyboard-source-notice">
            <StudioIcon name="sparkles" />
            <div>
              <strong>AI-generated plan</strong>
              <p>
                Verify factual claims before approval. Source-reference lookup
                will be added in a later Phase 4 slice.
              </p>
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

          {plan.approvalStatus === "REVIEW_READY" ? (
            <div className="storyboard-review-actions">
              <StoryboardActionButton
                mode="approve"
                projectId={projectId}
                versionId={plan.versionId}
                contentHash={plan.contentHash}
                revision={plan.revision}
              />
              <StoryboardActionButton
                mode="regenerate"
                projectId={projectId}
                variant="secondary"
                revision={plan.revision}
              />
              <small>
                Approval locks this revision. Regeneration creates a new one.
              </small>
            </div>
          ) : (
            <div className="storyboard-approved-note">
              <span>✓</span>
              <div>
                <strong>Approved revision</strong>
                <p>Ready for the future narration and rendering phase.</p>
              </div>
            </div>
          )}

          {revisions.length > 1 ? (
            <StoryboardRevisionHistory
              projectId={projectId}
              revisions={revisions}
              currentRevision={plan.revision}
              canSwitch={plan.project.status === "REVIEW_READY"}
            />
          ) : null}
        </aside>
      </div>
    </StudioShell>
  );
}
