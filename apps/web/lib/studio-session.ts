import { getDatabase } from "@motionly/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function requireStudioSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified) redirect("/verify-email");

  const database = await getDatabase();
  const profile = await database
    .collection("profiles")
    .findOne({ ownerId: session.user.id });
  if (!profile) redirect("/onboarding");

  return { session, profile };
}
