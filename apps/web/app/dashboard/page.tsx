import { listProjects } from "@motionly/db";
import Link from "next/link";
import { StudioIcon } from "../../components/studio-icon";
import { StudioShell } from "../../components/studio-shell";
import { requireStudioSession } from "../../lib/studio-session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { session } = await requireStudioSession();
  const projects = await listProjects(session.user.id);
  const { created } = await searchParams;
  const firstName = session.user.name.split(" ")[0] || "Creator";
  return (
    <StudioShell user={{ name: session.user.name, email: session.user.email }}>
      {created === "1" ? (
        <div className="studio-success" role="status">
          <span>✓</span>
          <div>
            <strong>Draft saved</strong>
            <p>Your idea is private and ready for the planning step.</p>
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

      <section className="dashboard-projects">
        <header>
          <div>
            <span className="studio-eyebrow">RECENT PROJECTS</span>
            <h2>
              {projects.length
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
                  <div>
                    <span className="project-status">DRAFT</span>
                    <span>{project.video.targetDurationSeconds}s</span>
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
                    <span>Planning is next</span>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-projects-new">
            <span>01</span>
            <div>
              <strong>No projects yet</strong>
              <p>
                Create your first video draft to begin building your library.
              </p>
            </div>
            <Link href="/dashboard/create">
              Create first video
              <StudioIcon name="arrow" />
            </Link>
          </div>
        )}
      </section>
    </StudioShell>
  );
}
