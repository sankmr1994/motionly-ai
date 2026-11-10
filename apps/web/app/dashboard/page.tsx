import { getDatabase } from "@motionly/db";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "../../components/sign-out-button";
import { auth } from "../../lib/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified) redirect("/verify-email");
  const database = await getDatabase();
  const profile = await database
    .collection("profiles")
    .findOne({ ownerId: session.user.id });
  if (!profile) redirect("/onboarding");
  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-brand">
          Motionly
        </Link>
        <nav>
          <Link className="active" href="/dashboard">
            Home
          </Link>
          <span>Projects</span>
          <span>Templates</span>
          <span>Publishing</span>
        </nav>
        <div>
          <p>{session.user.name}</p>
          <small>{session.user.email}</small>
          <SignOutButton />
        </div>
      </aside>
      <section className="dashboard-main">
        <header>
          <div>
            <span>YOUR CREATIVE WORKSPACE</span>
            <h1>Good to see you, {session.user.name.split(" ")[0]}.</h1>
          </div>
          <Link href="/dashboard" className="button button-primary">
            Create your first video →
          </Link>
        </header>
        <section className="dashboard-starter">
          <span>START WITH ONE IDEA</span>
          <h2>What should your audience understand today?</h2>
          <p>
            The guided creation workspace arrives in Phase 3. Your account and
            creative defaults are ready.
          </p>
          <button disabled>Describe your video idea</button>
        </section>
        <section className="recent-projects">
          <div>
            <span>RECENT PROJECTS</span>
            <h2>Your work will live here.</h2>
          </div>
          <div className="empty-projects">
            <strong>01</strong>
            <p>No projects yet</p>
            <small>
              Create your first video to begin building your library.
            </small>
          </div>
        </section>
      </section>
    </main>
  );
}
