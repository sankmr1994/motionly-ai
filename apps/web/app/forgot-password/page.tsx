import Link from "next/link";
import { AuthForm } from "../../components/auth-form";
import { AuthShell } from "../../components/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password."
      description="Enter your account email and we’ll send a secure, single-use reset link."
      footer={<Link href="/sign-in">Return to sign in</Link>}
    >
      <AuthForm mode="forgot-password" />
    </AuthShell>
  );
}
