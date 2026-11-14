import { getOrCreateCaptionReview, getProjectPlan } from "@motionly/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaptionEditor } from "../../../../../components/caption-editor";
import { StudioShell } from "../../../../../components/studio-shell";
import { requireStudioSession } from "../../../../../lib/studio-session";

export default async function CaptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ saved?: string; approved?: string }>;
}) {
  const { session } = await requireStudioSession();
  const { projectId } = await params;
  const { saved, approved } = await searchParams;
  const [plan, captions] = await Promise.all([
    getProjectPlan(session.user.id, projectId),
    getOrCreateCaptionReview(session.user.id, projectId),
  ]);
  if (!plan) notFound();
  if (plan.approvalStatus !== "APPROVED") {
    redirect(`/dashboard/projects/${projectId}/storyboard`);
  }
  if (!captions) redirect(`/dashboard/projects/${projectId}/narration`);
  const cueCount = captions.scenes.reduce(
    (total, scene) => total + scene.cues.length,
    0,
  );
  const overrunCount = captions.scenes.filter(
    (scene) => scene.fit === "OVERRUN",
  ).length;

  return (
    <StudioShell
      active="videos"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {saved === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Caption changes saved</strong>
            <p>Your caption review remains editable until final approval.</p>
          </div>
        </div>
      ) : null}
      {approved === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Captions approved</strong>
            <p>The synchronized timeline is ready for video rendering.</p>
          </div>
        </div>
      ) : null}

      <div className="studio-breadcrumbs">
        <Link href="/dashboard">My Videos</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${projectId}/narration`}>
          Narration
        </Link>
        <span>/</span>
        <strong>Captions</strong>
      </div>

      <section className="caption-heading">
        <div>
          <span className="studio-eyebrow">PHASE 5 · CAPTIONS</span>
          <h1>Caption timing review</h1>
          <p>
            Review stable, readable caption phrases synchronized directly from
            the approved narration timestamps.
          </p>
        </div>
        <span className={`caption-status ${captions.status.toLowerCase()}`}>
          {captions.status === "APPROVED"
            ? "Captions approved"
            : "Needs review"}
        </span>
      </section>

      <div className="caption-layout">
        <main>
          <CaptionEditor
            projectId={projectId}
            jobId={captions.jobId}
            version={captions.version}
            status={captions.status}
            initialStyle={captions.style}
            scenes={captions.scenes.map((scene) => ({
              ...scene,
              audioUrl: `/api/v1/projects/${projectId}/narrations/${captions.jobId}/scenes/${scene.sceneId}/audio`,
            }))}
          />
        </main>

        <aside className="caption-summary">
          <span className="studio-eyebrow">TIMELINE SUMMARY</span>
          <h2>{plan.project.title}</h2>
          <dl>
            <div>
              <dt>Storyboard</dt>
              <dd>Revision {captions.revision}</dd>
            </div>
            <div>
              <dt>Scenes</dt>
              <dd>{captions.scenes.length}</dd>
            </div>
            <div>
              <dt>Caption phrases</dt>
              <dd>{cueCount}</dd>
            </div>
            <div>
              <dt>Timing warnings</dt>
              <dd>{overrunCount}</dd>
            </div>
            <div>
              <dt>Style</dt>
              <dd>{captions.style.toLowerCase().replace("_", " ")}</dd>
            </div>
          </dl>
          <p>
            Caption timestamps come from ElevenLabs character alignment. Text
            edits do not change narration audio or protected timing.
          </p>
        </aside>
      </div>
    </StudioShell>
  );
}
