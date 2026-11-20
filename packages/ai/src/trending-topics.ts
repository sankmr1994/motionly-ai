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

const evergreenIdeas: Record<string, Array<{ title: string; idea: string }>> = {
  education: [
    {
      title: "Why spaced repetition works",
      idea: "Explain spaced repetition with a simple study schedule and show why reviewing just before forgetting improves long-term memory.",
    },
    {
      title: "The Feynman technique",
      idea: "Explain how learning by teaching a topic in simple words exposes gaps in understanding and helps a learner improve.",
    },
    {
      title: "How habits become automatic",
      idea: "Explain the cue, routine, and reward loop with one relatable everyday learning habit.",
    },
    {
      title: "Active recall versus rereading",
      idea: "Compare active recall with rereading and demonstrate why testing yourself produces stronger learning.",
    },
    {
      title: "How the brain handles focus",
      idea: "Explain why switching between tasks reduces focus and show a simple method for completing one task at a time.",
    },
    {
      title: "A better way to take notes",
      idea: "Explain a simple note-taking structure that separates key ideas, supporting details, and a short personal summary.",
    },
  ],
  technology: [
    {
      title: "How QR codes work",
      idea: "Explain how a QR code stores information, how a phone reads it, and why part of a damaged code can still work.",
    },
    {
      title: "What happens when you open a website",
      idea: "Explain the journey from typing a web address to DNS lookup, server response, and the page appearing on screen.",
    },
    {
      title: "Why passwords are hashed",
      idea: "Explain password hashing in beginner-friendly terms and show why websites should not store readable passwords.",
    },
    {
      title: "How cloud storage works",
      idea: "Explain how a file moves from a phone to cloud storage and becomes available on another device.",
    },
    {
      title: "Why AI can hallucinate",
      idea: "Explain in simple terms why a language model may produce a confident but incorrect answer and how users can verify important claims.",
    },
    {
      title: "How recommendation systems learn",
      idea: "Explain how viewing, liking, and skipping content help a recommendation system predict what a user may want next.",
    },
  ],
  business: [
    {
      title: "Revenue is not profit",
      idea: "Explain the difference between revenue, expenses, and profit using one small business example.",
    },
    {
      title: "How a sales funnel works",
      idea: "Explain awareness, consideration, purchase, and retention with a simple customer journey.",
    },
    {
      title: "Why customer retention matters",
      idea: "Explain how repeat customers affect growth and compare retention with constantly acquiring new customers.",
    },
    {
      title: "What makes a useful KPI",
      idea: "Explain the difference between a meaningful business KPI and a vanity metric using clear examples.",
    },
    {
      title: "How break-even works",
      idea: "Explain fixed costs, variable costs, and the break-even point with a small product example.",
    },
    {
      title: "The value of a clear niche",
      idea: "Explain how choosing a focused audience helps a small business communicate its value more clearly.",
    },
  ],
  finance: [
    {
      title: "How compound interest grows",
      idea: "Explain compound interest step by step with a small initial amount and show how returns begin earning returns.",
    },
    {
      title: "Inflation and purchasing power",
      idea: "Explain how inflation changes what the same amount of money can buy over time using an everyday example.",
    },
    {
      title: "Needs, wants, and savings",
      idea: "Explain a beginner-friendly way to divide income among needs, wants, and savings without giving personalized financial advice.",
    },
    {
      title: "What diversification means",
      idea: "Explain diversification with a simple basket analogy and why concentration increases risk.",
    },
    {
      title: "Simple versus compound interest",
      idea: "Compare simple and compound interest visually using the same starting amount and rate.",
    },
    {
      title: "How an emergency fund helps",
      idea: "Explain the purpose of an emergency fund and how it reduces dependence on high-cost borrowing.",
    },
  ],
  science: [
    {
      title: "How rainbows form",
      idea: "Explain how sunlight bends, reflects, and separates into colours inside raindrops to create a rainbow.",
    },
    {
      title: "Why the sky looks blue",
      idea: "Explain how sunlight scatters in the atmosphere and why blue light reaches our eyes from many directions.",
    },
    {
      title: "How eclipses happen",
      idea: "Explain the positions of the Sun, Earth, and Moon during solar and lunar eclipses.",
    },
    {
      title: "Why seasons change",
      idea: "Explain how Earth’s axial tilt changes sunlight across the year and why distance from the Sun is not the main cause.",
    },
    {
      title: "How vaccines train immunity",
      idea: "Explain at a high level how vaccines help the immune system recognize a threat, without giving medical advice.",
    },
    {
      title: "How plants move water upward",
      idea: "Explain how roots, tiny vessels, and evaporation work together to move water through a plant.",
    },
  ],
  wellness: [
    {
      title: "Why consistent sleep timing helps",
      idea: "Explain how a regular sleep schedule supports the body clock using general educational guidance, not medical advice.",
    },
    {
      title: "How a short walk affects attention",
      idea: "Explain the general relationship between light movement, alertness, and returning to focused work.",
    },
    {
      title: "Why hydration matters",
      idea: "Explain the basic role of water in the body and give general signs that remind people to drink regularly.",
    },
    {
      title: "How stress changes breathing",
      idea: "Explain the connection between stress and breathing rate and demonstrate a simple slow-breathing pattern for general wellbeing.",
    },
    {
      title: "Building a sustainable routine",
      idea: "Explain why making a habit small and repeatable is often more sustainable than relying on motivation alone.",
    },
    {
      title: "Why rest supports learning",
      idea: "Explain how breaks and sleep support memory consolidation using a beginner-friendly example.",
    },
  ],
};

export function createEvergreenTopicSuggestions(
  category: string,
  language: string,
): TrendingTopicSuggestion[] {
  const normalizedCategory = category.toLowerCase();
  const ideas = evergreenIdeas[normalizedCategory] ?? [
    ...evergreenIdeas.education!,
  ];
  return ideas.map((item) => ({
    ...item,
    category: category || "Education",
    whyNow: `A useful evergreen explainer for a general audience${language && language !== "English" ? `, presented in ${language}` : ""}.`,
  }));
}

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
  const { apiKey, model, fallbackModel } = getGeminiConfig();
  const client = createGeminiClient(apiKey);
  const localDate = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeZone: input.timezone || "UTC",
  }).format(new Date());

  let response:
    Awaited<ReturnType<typeof client.models.generateContent>> | undefined;
  let selectedModel = model;
  const candidateModels = [...new Set([model, fallbackModel])];
  for (const [index, candidateModel] of candidateModels.entries()) {
    try {
      response = await client.models.generateContent({
        model: candidateModel,
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
      selectedModel = candidateModel;
      break;
    } catch (error) {
      const status = getProviderErrorStatus(error);
      const retryable = status === 429 || status === 503 || status === 504;
      if (!retryable || index === candidateModels.length - 1) {
        throw new TrendingTopicsError("PROVIDER_REQUEST_FAILED", status, {
          cause: error,
        });
      }
    }
  }

  if (!response) throw new TrendingTopicsError("EMPTY_RESPONSE");
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
    model: selectedModel,
  };
}
