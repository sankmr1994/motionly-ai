import Link from "next/link";
import { CreateProjectForm } from "../../../components/create-project-form";
import { StudioShell } from "../../../components/studio-shell";
import { requireStudioSession } from "../../../lib/studio-session";

export default async function CreateVideoPage() {
  const { session } = await requireStudioSession();
  return (
    <StudioShell user={{ name: session.user.name, email: session.user.email }}>
      <div className="studio-breadcrumbs">
        <Link href="/dashboard">My Videos</Link>
        <span>/</span>
        <strong>New Video</strong>
      </div>
      <section className="create-page-heading">
        <div>
          <span className="studio-eyebrow">NEW PROJECT</span>
          <h1>Create New Video</h1>
          <p>
            Start with one idea or your complete script. Nothing is generated
            until you review and approve it.
          </p>
        </div>
        <ol className="creation-steps" aria-label="Video creation steps">
          <li className="active">
            <b>1</b>
            <span>Describe idea</span>
          </li>
          <li>
            <b>2</b>
            <span>Review plan</span>
          </li>
          <li>
            <b>3</b>
            <span>Customize</span>
          </li>
          <li>
            <b>4</b>
            <span>Generate</span>
          </li>
        </ol>
      </section>
      <section className="create-page-intro">
        <h2>What do you want to explain?</h2>
        <p>
          Describe your idea in a sentence or paste a complete script. Motionly
          will turn it into a clear visual story plan in the next step.
        </p>
      </section>
      <CreateProjectForm />
    </StudioShell>
  );
}
