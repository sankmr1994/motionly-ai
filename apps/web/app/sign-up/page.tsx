import Link from "next/link";
import { AuthForm } from "../../components/auth-form";
import { AuthShell } from "../../components/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="START CREATING"
      title="Your ideas deserve motion."
      description="Create a free account, verify your email, and shape your first video idea."
      footer={
        <>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </>
      }
    >
      <AuthForm mode="sign-up" />
    </AuthShell>
  );
}
