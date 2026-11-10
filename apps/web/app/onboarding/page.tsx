import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingForm } from "../../components/onboarding-form";
import { auth } from "../../lib/auth";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified) redirect("/verify-email");
  return (
    <main className="onboarding-page">
      <section className="onboarding-copy">
        <span>SET UP YOUR STUDIO</span>
        <h1>Help Motionly shape the right starting point.</h1>
        <p>
          Four quick choices personalize future templates, voice suggestions,
          and publishing schedules.
        </p>
        <ol>
          <li className="active">Creator profile</li>
          <li>First project</li>
          <li>Ready to publish</li>
        </ol>
      </section>
      <section className="onboarding-card">
        <span className="auth-eyebrow">ABOUT YOU · 1 OF 1</span>
        <h2>Your creative defaults</h2>
        <OnboardingForm defaultName={session.user.name} />
      </section>
    </main>
  );
}
