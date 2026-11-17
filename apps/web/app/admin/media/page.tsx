import { listAdminMediaOwners } from "@motionly/db";
import { notFound } from "next/navigation";
import { StudioShell } from "../../../components/studio-shell";
import { isMotionlyAdmin } from "../../../lib/admin-access";
import { reconcileAdminMediaOwners } from "../../../lib/admin-media-storage";
import { requireStudioSession } from "../../../lib/studio-session";

function formatBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

function statusTone(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "NOT_STARTED" || status === "DRAFT") return "muted";
  return "progress";
}

function StageStatus({ label, status }: { label: string; status: string }) {
  return (
    <div className="admin-stage-status">
      <small>{label}</small>
      <span className={statusTone(status)}>{status.replaceAll("_", " ")}</span>
    </div>
  );
}

export default async function AdminMediaPage() {
  const { session } = await requireStudioSession();
  if (!isMotionlyAdmin(session.user.email)) notFound();
  const owners = await reconcileAdminMediaOwners(await listAdminMediaOwners());
  const totals = owners.reduce(
    (current, owner) => ({
      projects: current.projects + owner.projectCount,
      narration: current.narration + owner.narrationCount,
      videoProjects: current.videoProjects + owner.videoProjectCount,
      videoFiles: current.videoFiles + owner.videoFileCount,
      missing: current.missing + owner.missingR2Count,
      bytes: current.bytes + owner.storedBytes,
    }),
    {
      projects: 0,
      narration: 0,
      videoProjects: 0,
      videoFiles: 0,
      missing: 0,
      bytes: 0,
    },
  );

  return (
    <StudioShell
      active="admin"
      user={{ name: session.user.name, email: session.user.email }}
    >
      <section className="admin-media-heading">
        <div>
          <span className="studio-eyebrow">LIVE R2 MEDIA ADMIN</span>
          <h1>User storage</h1>
          <p>
            MongoDB supplies project history; every media total below is checked
            directly against private Cloudflare R2.
          </p>
        </div>
        <span className="admin-private-badge">ADMIN ONLY</span>
      </section>

      <section className="admin-media-stats" aria-label="Media totals">
        <article>
          <span>ACTIVE PROJECTS</span>
          <strong>{totals.projects}</strong>
        </article>
        <article>
          <span>R2 AUDIO FILES</span>
          <strong>{totals.narration}</strong>
        </article>
        <article>
          <span>VIDEO PROJECTS</span>
          <strong>{totals.videoProjects}</strong>
        </article>
        <article>
          <span>R2 MP4 FILES</span>
          <strong>{totals.videoFiles}</strong>
        </article>
        <article>
          <span>STORED MEDIA</span>
          <strong>{formatBytes(totals.bytes)}</strong>
        </article>
        <article className={totals.missing ? "has-missing" : "is-healthy"}>
          <span>MISSING FROM R2</span>
          <strong>{totals.missing}</strong>
        </article>
      </section>

      <section className="admin-owner-list">
        <header>
          <div>
            <span className="studio-eyebrow">ACTIVE USER PROJECTS</span>
            <h2>Creation and storage status</h2>
          </div>
          <p>
            Archived and deleted projects are excluded. Multiple MP4 files can
            belong to one project when it has been rendered more than once.
          </p>
        </header>

        {owners.length ? (
          owners.map((owner) => (
            <article className="admin-owner-card" key={owner.ownerId}>
              <header>
                <span className="admin-owner-avatar">
                  {owner.name.charAt(0).toUpperCase() || "U"}
                </span>
                <div>
                  <h3>{owner.name}</h3>
                  <p>{owner.email}</p>
                </div>
                <dl>
                  <div>
                    <dt>Active</dt>
                    <dd>{owner.projectCount}</dd>
                  </div>
                  <div>
                    <dt>Audio</dt>
                    <dd>{owner.narrationCount}</dd>
                  </div>
                  <div>
                    <dt>Video projects</dt>
                    <dd>{owner.videoProjectCount}</dd>
                  </div>
                  <div>
                    <dt>MP4 files</dt>
                    <dd>{owner.videoFileCount}</dd>
                  </div>
                </dl>
              </header>
              <div className="admin-r2-prefix">
                <span>R2 FOLDER</span>
                <code>{owner.r2Prefix}</code>
              </div>
              <div className="admin-project-list">
                <div className="admin-project-list-head" aria-hidden="true">
                  <span>PROJECT</span>
                  <span>STORYBOARD</span>
                  <span>NARRATION</span>
                  <span>VIDEO</span>
                  <span>R2 ASSETS</span>
                </div>
                {owner.projects.map((project) => (
                  <div className="admin-project-row" key={project.id}>
                    <div className="admin-project-identity">
                      <strong>{project.title}</strong>
                      <small>{project.id}</small>
                      <time dateTime={project.updatedAt}>
                        Updated{" "}
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                        }).format(new Date(project.updatedAt))}
                      </time>
                    </div>
                    <StageStatus
                      label="Storyboard"
                      status={project.storyboardStatus}
                    />
                    <StageStatus
                      label="Narration"
                      status={project.narrationStatus}
                    />
                    <StageStatus label="Video" status={project.videoStatus} />
                    <div className="admin-r2-assets">
                      <strong>
                        {project.narrationR2Count} audio ·{" "}
                        {project.videoR2Count} MP4
                      </strong>
                      <small>{formatBytes(project.storedBytes)}</small>
                      {project.missingR2Count ? (
                        <span>{project.missingR2Count} missing</span>
                      ) : (
                        <span className="healthy">Verified in R2</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="admin-media-empty">
            No active media projects are stored yet.
          </div>
        )}
      </section>
    </StudioShell>
  );
}
