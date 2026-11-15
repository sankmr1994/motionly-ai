import {
  getLatestVideoRenderJob,
  getProjectPlan,
  VIDEO_RENDER_PIPELINE_VERSION,
} from "@motionly/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RenderStatusPoller } from "../../../../../components/render-status-poller";
import { StudioShell } from "../../../../../components/studio-shell";
import { VideoRenderActionButton } from "../../../../../components/video-render-action-button";
import { VideoReviewActions } from "../../../../../components/video-review-actions";
import { requireStudioSession } from "../../../../../lib/studio-session";

function formatBytes(bytes: number) {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default async function VideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    started?: string;
    rendering?: string;
    ready?: string;
    approved?: string;
  }>;
}) {
  const { session } = await requireStudioSession();
  const { projectId } = await params;
  const notices = await searchParams;
  const [plan, job] = await Promise.all([
    getProjectPlan(session.user.id, projectId),
    getLatestVideoRenderJob(session.user.id, projectId),
  ]);
  if (!plan) notFound();
  if (plan.approvalStatus !== "APPROVED") {
    redirect(`/dashboard/projects/${projectId}/storyboard`);
  }
  if (!job) redirect(`/dashboard/projects/${projectId}/captions`);
  const videoUrl = `/api/v1/projects/${projectId}/renders/${job.id}/video`;
  const motionUpdateAvailable =
    job.status === "COMPLETED" &&
    job.pipelineVersion !== VIDEO_RENDER_PIPELINE_VERSION;

  return (
    <StudioShell
      active="videos"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {notices.approved === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Finished video approved</strong>
            <p>Your MP4 is unlocked and ready to download.</p>
          </div>
        </div>
      ) : (notices.started === "1" || notices.rendering === "1") &&
        job.status === "RENDERING" ? (
        <div className="studio-success video-render-notice" role="status">
          <span>▶</span>
          <div>
            <strong>Video rendering started</strong>
            <p>You can leave this page and return without losing progress.</p>
          </div>
        </div>
      ) : notices.ready === "1" && job.status === "COMPLETED" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Finished video loaded</strong>
            <p>The existing render was reused; no duplicate was created.</p>
          </div>
        </div>
      ) : null}

      <div className="studio-breadcrumbs">
        <Link href="/dashboard">My Videos</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${projectId}/captions`}>Captions</Link>
        <span>/</span>
        <strong>Finished video</strong>
      </div>

      <section className="video-review-heading">
        <div>
          <span className="studio-eyebrow">PHASE 6 · FINISHED VIDEO</span>
          <h1>
            {job.status === "COMPLETED"
              ? "Review your finished video"
              : job.status === "FAILED"
                ? "Your video is safe to retry"
                : "Creating your finished video"}
          </h1>
          <p>
            Motionly combines the approved storyboard, narration, and caption
            timing into one private vertical MP4.
          </p>
        </div>
        <span
          className={`video-review-status ${
            job.reviewStatus === "APPROVED"
              ? "approved"
              : job.status.toLowerCase()
          }`}
        >
          {job.reviewStatus === "APPROVED"
            ? "Video approved"
            : job.status === "COMPLETED"
              ? "Ready to review"
              : job.status === "FAILED"
                ? "Render needs retry"
                : `${job.progress}% rendering`}
        </span>
      </section>

      {job.status === "RENDERING" ? (
        <section className="video-render-progress">
          <RenderStatusPoller />
          <div className="video-render-orbit" aria-hidden="true">
            <i />
            <span>MP4</span>
          </div>
          <div>
            <span className="studio-eyebrow">RENDERING IN PROGRESS</span>
            <h2>{job.progress}% complete</h2>
            <div className="video-progress-track">
              <i style={{ width: `${job.progress}%` }} />
            </div>
            <p>
              The page refreshes automatically. Your approved source work is
              already saved, so it is safe to leave and return later.
            </p>
            <Link href={`/dashboard/projects/${projectId}/video`}>
              Refresh status now
            </Link>
          </div>
        </section>
      ) : job.status === "FAILED" ? (
        <section className="video-render-failed">
          <span aria-hidden="true">!</span>
          <div>
            <span className="studio-eyebrow">SAFE TO RETRY</span>
            <h2>Video rendering did not finish</h2>
            <p>
              {job.error?.safeMessage ??
                "Your approved source work is safe. Please retry the render."}
            </p>
            <VideoRenderActionButton projectId={projectId} retry />
          </div>
        </section>
      ) : (
        <div className="video-review-layout">
          <main className="video-player-card">
            <div className="video-player-frame">
              <video controls preload="metadata" src={videoUrl}>
                Your browser does not support video playback.
              </video>
            </div>
            <div className="video-player-copy">
              <span className="studio-eyebrow">PRIVATE PREVIEW</span>
              <h2>{plan.project.title}</h2>
              <p>
                Play the full video and confirm that the voice, captions, and
                visual pacing feel right before approval.
              </p>
            </div>
          </main>

          <aside className="video-review-panel">
            <span className="studio-eyebrow">RENDER SUMMARY</span>
            <h2>Vertical social video</h2>
            <dl>
              <div>
                <dt>Storyboard</dt>
                <dd>Revision {job.revision}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{job.output?.durationSeconds.toFixed(1)} seconds</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>
                  {job.output?.width} × {job.output?.height}
                </dd>
              </div>
              <div>
                <dt>Frame rate</dt>
                <dd>{job.output?.fps} fps</dd>
              </div>
              <div>
                <dt>File size</dt>
                <dd>{job.output ? formatBytes(job.output.byteLength) : "—"}</dd>
              </div>
              <div>
                <dt>Captions</dt>
                <dd>{job.captionStyle.toLowerCase()}</dd>
              </div>
            </dl>
            {motionUpdateAvailable ? (
              <div className="video-motion-update">
                <span aria-hidden="true">✦</span>
                <div>
                  <strong>Improved motion is available</strong>
                  <p>
                    Render this same approved content with richer scene
                    animation and live progress tracking.
                  </p>
                  <VideoRenderActionButton
                    projectId={projectId}
                    label="Render improved video"
                  />
                </div>
              </div>
            ) : job.reviewStatus === "APPROVED" ? (
              <div className="video-approved-actions">
                <div>
                  <span>✓</span>
                  <p>
                    <strong>Approved and ready</strong>
                    Download the MP4 for publishing.
                  </p>
                </div>
                <a href={`${videoUrl}?download=1`}>↓ Download MP4</a>
              </div>
            ) : (
              <div className="video-pending-actions">
                <p>
                  Approval is required before the downloadable file is unlocked.
                  It does not publish anything.
                </p>
                <VideoReviewActions projectId={projectId} jobId={job.id} />
              </div>
            )}
          </aside>
        </div>
      )}
    </StudioShell>
  );
}
