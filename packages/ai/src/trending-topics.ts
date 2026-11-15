import { z } from "zod";
import { createGeminiClient } from "./gemini";
import { getGeminiConfig } from "./env";

const topicSuggestionSchema = z
  .object({
    title: z.string().min(3).max(70),
    idea: z.string().min(10).max(500),
    whyNow: z.string().min(3).max(180),
    category: z.string().min(2).max(40),
  })
  .strict();

const responseSchema = z
  .object({ suggestions: z.array(topicSuggestionSchema).length(6) })
  .strict();

export type TrendingTopicSuggestion = z.infer<typeof topicSuggestionSchema>;
export type TrendingTopicSource = { title: string; url: string };
export type TrendingTopicResult = {
  suggestions: TrendingTopicSuggestion[];
  sources: TrendingTopicSource[];
  searchQueries: string[];
  generatedAt: string;
  model: string;
};

type GroundingCandidate = {
  groundingMetadata?: {
    groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
    webSearchQueries?: string[];
  };
};

export function extractGroundedSources(candidates: unknown): {
  sources: TrendingTopicSource[];
  searchQueries: string[];
} {
  const candidate = Array.isArray(candidates)
    ? (candidates[0] as GroundingCandidate | undefined)
    : undefined;
  const metadata = candidate?.groundingMetadata;
  const seen = new Set<string>();
  const sources: TrendingTopicSource[] = [];
  for (const chunk of metadata?.groundingChunks ?? []) {
    const url = chunk.web?.uri?.trim();
    if (!url?.startsWith("https://") || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: chunk.web?.title?.trim() || "Web source", url });
  }
  return {
    sources: sources.slice(0, 8),
    searchQueries: (metadata?.webSearchQueries ?? [])
      .map((query) => query.trim())
      .filter(Boolean)
      .slice(0, 8),
  };
}

export class TrendingTopicsError extends Error {
  constructor(
    public readonly code:
      | "PROVIDER_REQUEST_FAILED"
      | "EMPTY_RESPONSE"
      | "INVALID_RESPONSE"
      | "UNGROUNDED_RESPONSE",
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "TrendingTopicsError";
  }
}

export function getProviderErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number(error.status);
    if (Number.isInteger(status)) return status;
  }
  if (!(error instanceof Error)) return undefined;
  try {
    const parsed = JSON.parse(error.message) as { error?: { code?: unknown } };
    const status = Number(parsed.error?.code);
    return Number.isInteger(status) ? status : undefined;
  } catch {
    return undefined;
  }
}

export async function generateTrendingTopicSuggestions(input: {
  category: string;
  language: string;
  timezone: string;
}): Promise<TrendingTopicResult> {
  const { apiKey, model } = getGeminiConfig();
  const client = createGeminiClient(apiKey);
  const localDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeZone: input.timezone || "UTC",
  }).format(new Date());

  let response: Awaited<ReturnType<typeof client.models.generateContent>>;
  try {
    response = await client.models.generateContent({
      model,
      contents: `Today is ${localDate}. Find six timely, verifiable topics that would make useful short educational Instagram Reels for a general audience.
Personalize them for the content category "${input.category}" and the language "${input.language}". Prefer topics relevant to an Indian audience when appropriate, without forcing an India angle.
Each "idea" must be a ready-to-use, beginner-friendly instruction describing exactly what the video should explain. "whyNow" must briefly state why the topic is timely.
Exclude rumors, partisan persuasion, graphic tragedies, celebrity gossip, medical diagnosis, and personalized financial advice. Never call an evergreen topic trending unless current search evidence supports it.
Return exactly six suggestions as JSON.`,
      config: {
        systemInstruction:
          "You are a careful editorial researcher for Motionly AI. Use Google Search for current facts. Return only valid JSON matching the requested schema.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: ["suggestions"],
          properties: {
            suggestions: {
              type: "array",
              minItems: 6,
              maxItems: 6,
              items: {
                type: "object",
                required: ["title", "idea", "whyNow", "category"],
                properties: {
                  title: { type: "string" },
                  idea: { type: "string" },
                  whyNow: { type: "string" },
                  category: { type: "string" },
                },
              },
            },
          },
        },
        temperature: 0.25,
        maxOutputTokens: 3_000,
      },
    });
  } catch (error) {
    throw new TrendingTopicsError(
      "PROVIDER_REQUEST_FAILED",
      getProviderErrorStatus(error),
      { cause: error },
    );
  }

  const text = response.text?.trim();
  if (!text) throw new TrendingTopicsError("EMPTY_RESPONSE");
  let parsed: z.infer<typeof responseSchema>;
  try {
    parsed = responseSchema.parse(JSON.parse(text));
  } catch (error) {
    throw new TrendingTopicsError("INVALID_RESPONSE", undefined, {
      cause: error,
    });
  }
  const grounding = extractGroundedSources(response.candidates);
  if (grounding.sources.length === 0) {
    throw new TrendingTopicsError("UNGROUNDED_RESPONSE");
  }
  return {
    suggestions: parsed.suggestions,
    ...grounding,
    generatedAt: new Date().toISOString(),
    model,
  };
}
