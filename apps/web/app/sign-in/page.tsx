import Link from "next/link";
import { AuthForm } from "../../components/auth-form";
import { AuthShell } from "../../components/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Turn your ideas into videos"
      description="Describe what you want to explain and Motionly creates an engaging animated video ready for Instagram and social media."
      footer={
        <>
          New to Motionly? <Link href="/sign-up">Create an account</Link>
        </>
      }
    >
      <AuthForm mode="sign-in" />
    </AuthShell>
  );
}
