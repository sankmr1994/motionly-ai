import { getLatestNarrationJob, getProjectPlan } from "@motionly/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NarrationActionButton } from "../../../../../components/narration-action-button";
import { NarrationPlayer } from "../../../../../components/narration-player";
import { StudioShell } from "../../../../../components/studio-shell";
import { requireStudioSession } from "../../../../../lib/studio-session";

export default async function NarrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ generated?: string; ready?: string }>;
}) {
  const { session } = await requireStudioSession();
  const { projectId } = await params;
  const { generated, ready } = await searchParams;
  const [plan, job] = await Promise.all([
    getProjectPlan(session.user.id, projectId),
    getLatestNarrationJob(session.user.id, projectId),
  ]);
  if (!plan) notFound();
  if (plan.approvalStatus !== "APPROVED") {
    redirect(`/dashboard/projects/${projectId}/storyboard`);
  }
  const completedScenes = job?.scenes.filter(
    (scene) => scene.status === "READY" && scene.audioReady,
  );
  const totalAudioSeconds = completedScenes?.reduce(
    (total, scene) => total + (scene.durationSeconds ?? 0),
    0,
  );

  return (
    <StudioShell
      active="videos"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {generated === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Narration ready</strong>
            <p>Every approved scene now has private preview audio.</p>
          </div>
        </div>
      ) : null}
      {ready === "1" ? (
        <div className="studio-success" role="status">
          <span>▶</span>
          <div>
            <strong>Existing narration loaded</strong>
            <p>No duplicate provider request or job was created.</p>
          </div>
        </div>
      ) : null}

      <div className="studio-breadcrumbs">
        <Link href="/dashboard">My Videos</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${projectId}/storyboard`}>
          Approved Storyboard
        </Link>
        <span>/</span>
        <strong>Narration</strong>
      </div>

      <section className="narration-heading">
        <div>
          <span className="studio-eyebrow">PHASE 5 · AUDIO</span>
          <h1>Narration studio</h1>
          <p>
            Generate and review English voice audio from the exact approved
            storyboard before captions or video rendering begin.
          </p>
        </div>
        <div className="narration-heading-actions">
          <span
            className={`narration-status ${job?.status.toLowerCase() ?? "new"}`}
          >
            {job?.status === "COMPLETED"
              ? "Audio ready"
              : job?.status === "GENERATING"
                ? `${job.progress}% generating`
                : job?.status === "FAILED"
                  ? "Needs retry"
                  : "Not generated"}
          </span>
          {job?.status === "COMPLETED" ? (
            <Link
              className="narration-caption-cta"
              href={`/dashboard/projects/${projectId}/captions`}
            >
              <span>
                <small>Next step</small>
                <strong>Review captions</strong>
              </span>
              <b aria-hidden="true">→</b>
            </Link>
          ) : null}
        </div>
      </section>

      <div className="narration-layout">
        <main>
          {!job ? (
            <section className="narration-start-card">
              <span>01</span>
              <div>
                <span className="studio-eyebrow">APPROVED INPUT</span>
                <h2>Turn this storyboard into voice audio</h2>
                <p>
                  Motionly will send each approved scene narration to ElevenLabs
                  and keep the resulting audio private. This does not render a
                  video or publish anything.
                </p>
                <NarrationActionButton projectId={projectId} />
              </div>
            </section>
          ) : job.status === "FAILED" ? (
            <section className="narration-failed-card">
              <span aria-hidden="true">!</span>
              <div>
                <span className="studio-eyebrow">SAFE TO RETRY</span>
                <h2>Narration was not completed</h2>
                <p>
                  {job.error?.safeMessage ??
                    "Your approved storyboard is unchanged. Please retry the audio generation."}
                </p>
                <NarrationActionButton projectId={projectId} retry />
              </div>
            </section>
          ) : job.status === "GENERATING" ? (
            <section className="narration-progress-card">
              <span className="studio-eyebrow">GENERATING AUDIO</span>
              <h2>{job.progress}% complete</h2>
              <div>
                <i style={{ width: `${job.progress}%` }} />
              </div>
              <p>
                {completedScenes?.length ?? 0} of {job.scenes.length} scenes are
                ready. You can safely refresh this page.
              </p>
              <Link href={`/dashboard/projects/${projectId}/narration`}>
                Refresh status
              </Link>
            </section>
          ) : (
            <NarrationPlayer
              scenes={job.scenes.map((scene) => ({
                sceneId: scene.sceneId,
                title: scene.title,
                narration: scene.narration,
                durationSeconds: scene.durationSeconds,
                audioUrl: `/api/v1/projects/${projectId}/narrations/${job.id}/scenes/${scene.sceneId}/audio`,
              }))}
            />
          )}
        </main>

        <aside className="narration-summary">
          <span className="studio-eyebrow">AUDIO SUMMARY</span>
          <h2>{plan.project.title}</h2>
          <dl>
            <div>
              <dt>Storyboard</dt>
              <dd>Revision {plan.revision}</dd>
            </div>
            <div>
              <dt>Scenes</dt>
              <dd>{plan.storyboard.scenes.length}</dd>
            </div>
            <div>
              <dt>Voice</dt>
              <dd>{job?.voice.displayName ?? "Motionly Indian Educator"}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{job?.voice.model ?? "eleven_multilingual_v2"}</dd>
            </div>
            {job?.status === "COMPLETED" ? (
              <div>
                <dt>Audio length</dt>
                <dd>{totalAudioSeconds?.toFixed(1)} seconds</dd>
              </div>
            ) : null}
          </dl>
          <p>
            Audio is tied to the approved content hash. Storyboard changes
            require a new approval and narration job.
          </p>
        </aside>
      </div>
    </StudioShell>
  );
}
