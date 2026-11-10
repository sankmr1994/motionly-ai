"use server";

import { getDatabase } from "@motionly/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";

const categories = new Set([
  "education",
  "technology",
  "business",
  "finance",
  "science",
  "wellness",
  "other",
]);
const languages = new Set([
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
]);
const goals = new Set([
  "grow-audience",
  "teach-clearly",
  "build-brand",
  "publish-consistently",
  "experiment",
]);

export async function completeOnboarding(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");

  const name = String(formData.get("name") ?? "").trim();
  const contentCategory = String(formData.get("contentCategory") ?? "");
  const language = String(formData.get("language") ?? "");
  const publishingGoal = String(formData.get("publishingGoal") ?? "");
  const timezone = String(formData.get("timezone") ?? "UTC").trim();
  if (
    name.length < 2 ||
    !categories.has(contentCategory) ||
    !languages.has(language) ||
    !goals.has(publishingGoal) ||
    timezone.length > 100
  ) {
    throw new Error("Please complete every onboarding field.");
  }

  const database = await getDatabase();
  await database.collection("profiles").updateOne(
    { ownerId: session.user.id },
    {
      $set: {
        name,
        contentCategory,
        language,
        publishingGoal,
        timezone,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      },
      $setOnInsert: { ownerId: session.user.id, createdAt: new Date() },
    },
    { upsert: true },
  );

  redirect("/dashboard");
}
