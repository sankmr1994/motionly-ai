import Link from "next/link";
import { AuthShell } from "../../components/auth-shell";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <AuthShell
      eyebrow="ONE LAST STEP"
      title="Check your inbox."
      description={`We sent a verification link${email ? ` to ${email}` : " to your email"}. Open it to activate your account and continue to onboarding.`}
      footer={
        <>
          <Link href="/sign-in">Return to sign in</Link>
          <span> · </span>
          <Link href="/">Back home</Link>
        </>
      }
    >
      <div className="verification-visual" aria-hidden="true">
        <span>✓</span>
      </div>
    </AuthShell>
  );
}
