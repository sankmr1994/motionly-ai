import {
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
  } catch (error) {
    if (cached) {
      return {
        ...cached.result,
        cached: true,
        stale: true,
        refreshAvailableAt: now.toISOString(),
      };
    }
    throw error;
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
