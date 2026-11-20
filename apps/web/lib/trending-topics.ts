import {
  createEvergreenTopicSuggestions,
  generatePersonalizedEvergreenTopicSuggestions,
  generateTrendingTopicSuggestions,
  type TrendingTopicResult,
} from "@motionly/ai";
import { getDatabase } from "@motionly/db";

const CACHE_DURATION_MS = 3 * 60 * 60 * 1_000;
const REFRESH_COOLDOWN_MS = 15 * 60 * 1_000;

type TopicCacheDocument = {
  ownerId: string;
  cacheKey: string;
  category: string;
  language: string;
  result: TrendingTopicResult;
  generatedAt: Date;
  expiresAt: Date;
  updatedAt: Date;
};

export async function getTrendingTopicsForOwner(input: {
  ownerId: string;
  category: string;
  language: string;
  timezone: string;
  force: boolean;
}) {
  const database = await getDatabase();
  const collection = database.collection<TopicCacheDocument>(
    "topicSuggestionCaches",
  );
  const cacheKey = `${input.category}:${input.language}`.toLowerCase();
  const now = new Date();
  const cached = await collection.findOne({
    ownerId: input.ownerId,
    cacheKey,
  });
  const refreshAllowed =
    !cached ||
    now.getTime() - cached.generatedAt.getTime() >= REFRESH_COOLDOWN_MS;
  if (cached && cached.expiresAt > now && (!input.force || !refreshAllowed)) {
    return {
      ...cached.result,
      cached: true,
      stale: false,
      refreshAvailableAt: new Date(
        cached.generatedAt.getTime() + REFRESH_COOLDOWN_MS,
      ).toISOString(),
    };
  }

  let result: TrendingTopicResult;
  try {
    result = await generateTrendingTopicSuggestions({
      category: input.category,
      language: input.language,
      timezone: input.timezone,
    });
  } catch (liveError) {
    if (cached) {
      return {
        ...cached.result,
        cached: true,
        stale: true,
        refreshAvailableAt: now.toISOString(),
        fallbackMode: "stale-cache" as const,
      };
    }
    try {
      const aiFallback = await generatePersonalizedEvergreenTopicSuggestions({
        category: input.category,
        language: input.language,
      });
      return {
        ...aiFallback,
        cached: false,
        stale: true,
        refreshAvailableAt: now.toISOString(),
        fallbackMode: "ai-evergreen" as const,
        providerStatus:
          typeof liveError === "object" &&
          liveError !== null &&
          "status" in liveError
            ? Number(liveError.status) || undefined
            : undefined,
      };
    } catch {
      // The provider itself is unavailable, so keep the create flow useful with
      // a small, clearly labelled, application-owned starter library.
    }
    return {
      suggestions: createEvergreenTopicSuggestions(
        input.category,
        input.language,
      ),
      sources: [],
      searchQueries: [],
      generatedAt: now.toISOString(),
      model: "motionly-evergreen-fallback",
      cached: false,
      stale: true,
      refreshAvailableAt: now.toISOString(),
      fallbackMode: "evergreen" as const,
      providerStatus:
        typeof liveError === "object" &&
        liveError !== null &&
        "status" in liveError
          ? Number(liveError.status) || undefined
          : undefined,
    };
  }
  const generatedAt = new Date(result.generatedAt);
  const expiresAt = new Date(generatedAt.getTime() + CACHE_DURATION_MS);
  await collection.updateOne(
    { ownerId: input.ownerId, cacheKey },
    {
      $set: {
        category: input.category,
        language: input.language,
        result,
        generatedAt,
        expiresAt,
        updatedAt: now,
      },
      $setOnInsert: { ownerId: input.ownerId, cacheKey },
    },
    { upsert: true },
  );
  return {
    ...result,
    cached: false,
    stale: false,
    refreshAvailableAt: new Date(
      generatedAt.getTime() + REFRESH_COOLDOWN_MS,
    ).toISOString(),
  };
}
