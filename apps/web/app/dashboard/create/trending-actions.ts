"use server";

import type {
  TrendingTopicSource,
  TrendingTopicSuggestion,
} from "@motionly/ai";
import { TrendingTopicsError } from "@motionly/ai";
import { getDatabase } from "@motionly/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../../lib/auth";
import { getTrendingTopicsForOwner } from "../../../lib/trending-topics";

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

export type TrendingTopicsActionState = {
  suggestions?: TrendingTopicSuggestion[];
  sources?: TrendingTopicSource[];
  generatedAt?: string;
  cached?: boolean;
  message?: string;
};

export async function loadTrendingTopics(
  _previousState: TrendingTopicsActionState,
  formData: FormData,
): Promise<TrendingTopicsActionState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.emailVerified) redirect("/sign-in");
  const profile = await (await getDatabase()).collection("profiles").findOne({
    ownerId: session.user.id,
  });
  const category = String(profile?.contentCategory ?? "");
  const language = String(profile?.language ?? "");
  const timezone = String(profile?.timezone ?? "UTC").slice(0, 100);
  if (!categories.has(category) || !languages.has(language)) {
    return {
      message: "Complete your content preferences before requesting ideas.",
    };
  }
  try {
    const result = await getTrendingTopicsForOwner({
      ownerId: session.user.id,
      category,
      language,
      timezone,
      force: formData.get("refreshTopics") === "1",
    });
    return {
      suggestions: result.suggestions,
      sources: result.sources,
      generatedAt: result.generatedAt,
      cached: result.cached,
      ...(result.stale
        ? {
            message:
              "Showing your last saved ideas because live topic discovery is unavailable right now.",
          }
        : {}),
    };
  } catch (error) {
    if (error instanceof TrendingTopicsError && error.status === 429) {
      return {
        message:
          "Today's AI topic-suggestion limit has been reached. Please try again later or enter your own idea.",
      };
    }
    return {
      message:
        "Live topic suggestions are temporarily unavailable. You can still enter your own idea.",
    };
  }
}
