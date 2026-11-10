import { AuthForm } from "../../components/auth-form";
import { AuthShell } from "../../components/auth-shell";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell
      eyebrow="SECURE RESET"
      title="Choose a new password."
      description="Use at least 10 characters and avoid reusing a password from another service."
    >
      <AuthForm mode="reset-password" token={token} />
    </AuthShell>
  );
}
