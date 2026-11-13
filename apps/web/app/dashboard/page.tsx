import { listProjects } from "@motionly/db";
import Link from "next/link";
import { ProjectActions } from "../../components/project-actions";
import { StudioIcon } from "../../components/studio-icon";
import { StudioShell } from "../../components/studio-shell";
import { StoryboardActionButton } from "../../components/storyboard-action-button";
import { requireStudioSession } from "../../lib/studio-session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; view?: string }>;
}) {
  const { session } = await requireStudioSession();
  const { created, updated, view } = await searchParams;
  const archived = view === "archived";
  const projects = await listProjects(session.user.id, 50, { archived });
  const firstName = session.user.name.split(" ")[0] || "Creator";
  return (
    <StudioShell
      active="videos"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {created === "1" || updated === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>{updated === "1" ? "Draft updated" : "Draft saved"}</strong>
            <p>
              {updated === "1"
                ? "Your changes are saved and the earlier version remains in project history."
                : "Your idea is private and ready for the planning step."}
            </p>
          </div>
        </div>
      ) : null}

      <section className="dashboard-heading">
        <div>
          <span className="studio-eyebrow">YOUR CREATIVE WORKSPACE</span>
          <h1>Good to see you, {firstName}.</h1>
          <p>Turn one clear idea into a video your audience can understand.</p>
        </div>
        <Link href="/dashboard/create" className="studio-primary-button">
          <StudioIcon name="add" />
          Create video
        </Link>
      </section>

      {!archived && projects.length === 0 ? (
        <section className="dashboard-idea-card">
          <div className="idea-card-copy">
            <span>START WITH ONE IDEA</span>
            <h2>What should your audience understand today?</h2>
            <p>
              You do not need editing experience. Describe the topic, choose the
              length, and save your first private draft.
            </p>
            <Link href="/dashboard/create" className="idea-prompt-link">
              <StudioIcon name="bulb" />
              <span>Describe your video idea</span>
              <StudioIcon name="arrow" />
            </Link>
            <div className="idea-suggestions">
              <span>Try an idea:</span>
              <Link href="/dashboard/create">How habits form</Link>
              <Link href="/dashboard/create">Explain compound interest</Link>
              <Link href="/dashboard/create">How binary search works</Link>
            </div>
          </div>
          <div className="idea-storyboard" aria-hidden="true">
            <span>IDEA</span>
            <div className="storyboard-line">
              <i />
              <i />
              <i />
            </div>
            <div className="storyboard-frame large">
              <b>01</b>
              <em />
            </div>
            <div className="storyboard-frame">
              <b>02</b>
              <em />
            </div>
            <div className="storyboard-frame">
              <b>03</b>
              <em />
            </div>
            <span>VIDEO PLAN</span>
          </div>
        </section>
      ) : null}

      <section className="dashboard-projects">
        <header>
          <div>
            <span className="studio-eyebrow">MY VIDEOS</span>
            <h2>
              {archived
                ? "Archived projects"
                : projects.length
                  ? "Continue creating"
                  : "Your work will live here."}
            </h2>
          </div>
          {projects.length ? (
            <span className="project-count">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          ) : null}
        </header>

        <nav className="project-view-tabs" aria-label="Project views">
          <Link className={!archived ? "active" : ""} href="/dashboard">
            Active
          </Link>
          <Link
            className={archived ? "active" : ""}
            href="/dashboard?view=archived"
          >
            Archived
          </Link>
        </nav>

        {projects.length ? (
          <div className="project-grid">
            {projects.map((project, index) => (
              <article className="project-card" key={project.id}>
                <div className="project-thumbnail">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <i />
                    <i />
                    <i />
                  </div>
                  <small>9:16</small>
                </div>
                <div className="project-card-copy">
                  <div className="project-card-meta">
                    <div>
                      <span className="project-status">
                        {project.archived ? "ARCHIVED" : project.status}
                      </span>
                      <span>{project.video.targetDurationSeconds}s</span>
                    </div>
                    <ProjectActions
                      archived={project.archived}
                      canDelete={project.canDelete}
                      projectId={project.id}
                      status={project.status}
                      title={project.title}
                    />
                  </div>
                  <h3>{project.title}</h3>
                  <p>
                    {project.inputMode === "TOPIC"
                      ? "Idea draft"
                      : "Script draft"}
                    {project.topic ? ` · ${project.topic}` : " · Ready to plan"}
                  </p>
                  <footer>
                    <time dateTime={project.updatedAt}>
                      Updated{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(project.updatedAt))}
                    </time>
                    {project.archived ? (
                      <span>Stored safely</span>
                    ) : project.status === "DRAFT" ? (
                      <StoryboardActionButton
                        mode="plan"
                        projectId={project.id}
                        variant="secondary"
                      />
                    ) : project.status === "REVIEW_READY" ||
                      project.status === "APPROVED" ? (
                      <Link
                        className="project-review-link"
                        href={`/dashboard/projects/${project.id}/storyboard`}
                      >
                        {project.status === "APPROVED"
                          ? "View approved plan"
                          : "Review storyboard"}
                      </Link>
                    ) : project.status === "PLANNING" ? (
                      <StoryboardActionButton
                        mode="plan"
                        projectId={project.id}
                        variant="secondary"
                        label="Retry storyboard"
                      />
                    ) : (
                      <span>{project.status.replaceAll("_", " ")}</span>
                    )}
                  </footer>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-projects-new">
            <span>01</span>
            <div>
              <strong>
                {archived ? "No archived projects" : "No projects yet"}
              </strong>
              <p>
                {archived
                  ? "Projects you archive will stay here until you restore or delete them."
                  : "Create your first video draft to begin building your library."}
              </p>
            </div>
            <Link href={archived ? "/dashboard" : "/dashboard/create"}>
              {archived ? "Back to active" : "Create first video"}
              <StudioIcon name="arrow" />
            </Link>
          </div>
        )}
      </section>

      {!archived && projects.length > 0 ? (
        <section className="dashboard-next-video">
          <div>
            <span className="studio-eyebrow">CREATE YOUR NEXT VIDEO</span>
            <h2>Have another idea worth sharing?</h2>
            <p>Start a fresh draft whenever inspiration arrives.</p>
          </div>
          <Link href="/dashboard/create">
            <StudioIcon name="add" />
            Create another video
          </Link>
        </section>
      ) : null}
    </StudioShell>
  );
}
