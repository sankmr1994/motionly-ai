import { GoogleGenAI } from "@google/genai";
import {
  storyboardSchema,
  type ProjectInputMode,
  type ProjectReference,
  type Storyboard,
  type VideoDefaults,
} from "@motionly/shared";
import { z } from "zod";
import { getGeminiConfig } from "./env";

const systemInstruction = `You create concise educational explainer storyboards for Motionly AI.
Return only data matching the supplied JSON schema.
Use only the declared templates and animation actions.
All scene durations must total exactly the requested video duration.
Never emit executable code, HTML, JavaScript, URLs, or arbitrary component names.
Diagrams and quantitative displays must be accurate and clearly labeled.`;

const GEMINI_REQUEST_TIMEOUT_MS = 55_000;

const createGeminiClient = (apiKey: string) =>
  new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS },
  });

const providerAnimationActionSchema = z
  .object({
    type: z.enum(["SHOW", "MOVE", "LABEL", "HIGHLIGHT", "DRAW", "ZOOM"]),
    targets: z.array(z.string()).optional(),
    sequence: z.enum(["TOGETHER", "STAGGERED"]).optional(),
    target: z.string().optional(),
    to: z.string().optional(),
    cue: z.string().optional(),
  })
  .strict();

// Gemini supports a subset of JSON Schema. Keep its response schema simple,
// then validate the returned data with the stricter shared storyboard schema.
const providerStoryboardSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    project: z
      .object({
        name: z.literal("Motionly AI"),
        inputMode: z.enum(["TOPIC", "SCRIPT"]),
        topic: z.string().optional(),
        sourceScript: z.string().optional(),
        contentType: z.literal("EXPLAINER"),
      })
      .strict(),
    video: z
      .object({
        width: z.literal(720),
        height: z.literal(1280),
        fps: z.literal(30),
        targetDurationSeconds: z.union([
          z.literal(30),
          z.literal(45),
          z.literal(60),
        ]),
        style: z.literal("CLEAN_2D_EDUCATIONAL"),
      })
      .strict(),
    scenes: z.array(
      z
        .object({
          id: z.string(),
          title: z.string().optional(),
          durationEstimateSeconds: z.number(),
          template: z.enum([
            "TITLE",
            "BULLET_LIST",
            "TIMELINE",
            "PROCESS",
            "STAT_CARD",
            "ICON_GRID",
            "BEFORE_AFTER",
            "DIAGRAM",
            "SHADOW_DIAGRAM",
            "ECLIPSE_VIEW",
            "NUMBER_FLOW",
            "FORMULA",
            "GROWTH_CHART",
            "COMPARISON",
            "SORTED_ARRAY",
            "MIDPOINT",
            "DISCARD_HALF",
            "FOUND_TARGET",
            "COMPLEXITY",
          ]),
          narration: z.string(),
          objects: z.array(z.string()),
          actions: z.array(providerAnimationActionSchema),
        })
        .strict(),
    ),
  })
  .strict();

type JsonSchemaValue =
  | null
  | boolean
  | number
  | string
  | JsonSchemaValue[]
  | { [key: string]: JsonSchemaValue };

function makeGeminiCompatibleSchema(value: JsonSchemaValue): JsonSchemaValue {
  if (Array.isArray(value)) return value.map(makeGeminiCompatibleSchema);
  if (value === null || typeof value !== "object") return value;

  const source = value as Record<string, JsonSchemaValue>;
  const result: Record<string, JsonSchemaValue> = {};
  for (const [key, item] of Object.entries(source)) {
    if (
      key === "$schema" ||
      key === "pattern" ||
      key === "minLength" ||
      key === "maxLength" ||
      key === "exclusiveMinimum"
    ) {
      continue;
    }
    result[key] = makeGeminiCompatibleSchema(item);
  }

  if ("const" in source) {
    result.enum = [source.const];
    delete result.const;
  }

  const alternatives = source.anyOf;
  if (
    Array.isArray(alternatives) &&
    alternatives.length > 0 &&
    alternatives.every(
      (item) => item !== null && typeof item === "object" && "const" in item,
    )
  ) {
    const branches = alternatives as Array<Record<string, JsonSchemaValue>>;
    result.type = branches[0]?.type ?? "number";
    result.enum = branches.map((item) => item.const as JsonSchemaValue);
    delete result.anyOf;
  }

  return result;
}

export const geminiStoryboardResponseSchema = makeGeminiCompatibleSchema(
  z.toJSONSchema(providerStoryboardSchema) as JsonSchemaValue,
);

const providerScenePlanSchema = z
  .object({
    referenceAssessment: z
      .object({
        relevant: z.boolean(),
        reason: z.string().min(1).max(240),
      })
      .strict()
      .optional(),
    scenes: z
      .array(
        z
          .object({
            title: z.string().min(1).max(60),
            template: z.enum([
              "TITLE",
              "BULLET_LIST",
              "TIMELINE",
              "PROCESS",
              "STAT_CARD",
              "ICON_GRID",
              "BEFORE_AFTER",
              "DIAGRAM",
              "SHADOW_DIAGRAM",
              "ECLIPSE_VIEW",
              "NUMBER_FLOW",
              "FORMULA",
              "GROWTH_CHART",
              "COMPARISON",
              "SORTED_ARRAY",
              "MIDPOINT",
              "DISCARD_HALF",
              "FOUND_TARGET",
              "COMPLEXITY",
            ]),
            narration: z.string().min(1).max(1_000),
            objects: z.array(z.string().min(1).max(80)).min(1).max(12),
          })
          .strict(),
      )
      .min(0)
      .max(10),
  })
  .strict();

export const geminiScenePlanResponseSchema = makeGeminiCompatibleSchema(
  z.toJSONSchema(providerScenePlanSchema) as JsonSchemaValue,
);

type ProviderScenePlan = z.infer<typeof providerScenePlanSchema>;

export class StoryboardGenerationError extends Error {
  constructor(
    public readonly code:
      | "PROVIDER_REQUEST_FAILED"
      | "REFERENCE_RETRIEVAL_FAILED"
      | "REFERENCE_NOT_RELEVANT"
      | "EMPTY_RESPONSE"
      | "INVALID_RESPONSE",
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "StoryboardGenerationError";
  }
}

export type StoryboardGenerationInput = {
  inputMode: ProjectInputMode;
  content: string;
  references: ProjectReference[];
  video: VideoDefaults;
};

export type StoryboardGenerationResult = {
  storyboard: Storyboard;
  provider: "GOOGLE_GEMINI";
  model: string;
  generatedAt: string;
};

const normalizeScript = (value: string) => value.replace(/\s+/g, " ").trim();

export function evaluateReferenceRelevance(
  referenceCount: number,
  assessment: ProviderScenePlan["referenceAssessment"],
): "not_required" | "relevant" | "missing" | "not_relevant" {
  if (referenceCount === 0) return "not_required";
  if (!assessment) return "missing";
  return assessment.relevant ? "relevant" : "not_relevant";
}

function splitScript(value: string, requestedParts: number): string[] {
  const words = normalizeScript(value).split(" ").filter(Boolean);
  const partCount = Math.max(1, Math.min(requestedParts, words.length));
  const baseSize = Math.floor(words.length / partCount);
  const remainder = words.length % partCount;
  const parts: string[] = [];
  let offset = 0;
  for (let index = 0; index < partCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    parts.push(words.slice(offset, offset + size).join(" "));
    offset += size;
  }
  return parts;
}

function parseJsonObject(value: string): unknown {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Gemini response did not contain a JSON object.");
  }
  return JSON.parse(value.slice(start, end + 1));
}

function compileProviderPlan(
  input: StoryboardGenerationInput,
  plan: ProviderScenePlan,
): Storyboard {
  const requestedCount = plan.scenes.length;
  const scriptParts =
    input.inputMode === "SCRIPT"
      ? splitScript(input.content, requestedCount)
      : undefined;
  const sceneCount = scriptParts?.length ?? requestedCount;
  const scenes = plan.scenes.slice(0, sceneCount).map((scene, index) => {
    const objects = scene.objects
      .map((object) => object.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 12);
    const safeObjects =
      objects.length > 0 ? objects : [scene.title.slice(0, 80)];
    const baseDuration = input.video.targetDurationSeconds / sceneCount;
    const durationEstimateSeconds =
      index === sceneCount - 1
        ? input.video.targetDurationSeconds - baseDuration * (sceneCount - 1)
        : baseDuration;
    return {
      id: `scene_${String(index + 1).padStart(2, "0")}`,
      title: scene.title.trim().slice(0, 60),
      durationEstimateSeconds,
      template: scene.template,
      narration:
        input.inputMode === "SCRIPT"
          ? (scriptParts?.[index] ?? "")
          : scene.narration.trim().slice(0, 1_000),
      objects: safeObjects,
      actions: [
        {
          type: "SHOW" as const,
          targets: safeObjects,
          sequence: "STAGGERED" as const,
        },
      ],
    };
  });

  return storyboardSchema.parse({
    schemaVersion: "0.1",
    project: {
      name: "Motionly AI",
      inputMode: input.inputMode,
      ...(input.inputMode === "TOPIC"
        ? { topic: input.content }
        : { sourceScript: input.content }),
      contentType: "EXPLAINER",
    },
    video: {
      width: 720,
      height: 1280,
      fps: 30,
      targetDurationSeconds: input.video.targetDurationSeconds,
      style: "CLEAN_2D_EDUCATIONAL",
    },
    scenes,
  });
}

export const generateProjectStoryboard = async (
  input: StoryboardGenerationInput,
): Promise<StoryboardGenerationResult> => {
  const { apiKey, model, fallbackModel } = getGeminiConfig();
  const client = createGeminiClient(apiKey);
  const duration = input.video.targetDurationSeconds;
  const sceneCount = duration === 30 ? 5 : duration === 45 ? 6 : 8;
  const inputInstruction =
    input.inputMode === "SCRIPT"
      ? `Plan visuals for this user-supplied script. Motionly will preserve and split the original narration locally, so use narration only as a short scene summary:\n\n${input.content}`
      : `Create a clear beginner-friendly educational narration and storyboard for this idea:\n\n${input.content}`;
  const referenceInstruction = input.references.length
    ? `\nUse the URL Context tool to read these user-provided references. First decide whether they materially support the user's idea. If they are unrelated, set "referenceAssessment.relevant" to false, explain why in one simple sentence, and return an empty "scenes" array. If they are relevant, set it to true, ground factual claims in them, and do not invent claims that conflict with them:\n${input.references
        .map(({ url }, index) => `${index + 1}. ${url}`)
        .join("\n")}`
    : "";
  const request = {
    contents: `Create a ${sceneCount}-scene vertical educational explainer plan.
${inputInstruction}${referenceInstruction}
Return one JSON object with a "scenes" array. ${
      input.references.length
        ? 'Also return "referenceAssessment" with exactly "relevant" and "reason" fields.'
        : "Do not return a referenceAssessment field."
    }
Every scene must contain exactly these fields: "title", "template", "narration", and "objects".
Use one of these template values: TITLE, BULLET_LIST, TIMELINE, PROCESS, STAT_CARD, ICON_GRID, BEFORE_AFTER, DIAGRAM, COMPARISON, FORMULA, or GROWTH_CHART.
The "objects" value must be an array of short visual labels. Do not calculate timing or animation actions; Motionly adds those locally.`,
    config: {
      systemInstruction: `You plan concise educational explainer scenes for Motionly AI.
Return only valid JSON without markdown or code fences.
Use only declared template identifiers.
Never emit executable code, HTML, JavaScript, URLs, or arbitrary component names.`,
      temperature: input.inputMode === "SCRIPT" ? 0.15 : 0.35,
      maxOutputTokens: 4_096,
      ...(input.references.length ? { tools: [{ urlContext: {} }] } : {}),
    },
  };

  let response:
    Awaited<ReturnType<typeof client.models.generateContent>> | undefined;
  let selectedModel = model;
  const modelCandidates = [...new Set([model, fallbackModel])];
  for (let attempt = 0; attempt < modelCandidates.length; attempt += 1) {
    const candidateModel = modelCandidates[attempt] ?? model;
    try {
      response = await client.models.generateContent({
        ...request,
        model: candidateModel,
      });
      selectedModel = candidateModel;
      break;
    } catch (error) {
      const status =
        typeof error === "object" && error && "status" in error
          ? Number(error.status)
          : undefined;
      const retryable = status === 429 || status === 503 || status === 504;
      const hasFallback = attempt < modelCandidates.length - 1;
      if (!retryable || !hasFallback) {
        throw new StoryboardGenerationError("PROVIDER_REQUEST_FAILED", status, {
          cause: error,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  if (!response?.text) {
    throw new StoryboardGenerationError("EMPTY_RESPONSE");
  }
  if (input.references.length) {
    const retrievals =
      response.candidates?.[0]?.urlContextMetadata?.urlMetadata ?? [];
    const allRetrieved =
      retrievals.length >= input.references.length &&
      retrievals.every(
        ({ urlRetrievalStatus }) =>
          urlRetrievalStatus === "URL_RETRIEVAL_STATUS_SUCCESS",
      );
    if (!allRetrieved) {
      throw new StoryboardGenerationError("REFERENCE_RETRIEVAL_FAILED");
    }
  }
  let storyboard: Storyboard;
  try {
    const plan = providerScenePlanSchema.parse(parseJsonObject(response.text));
    const relevance = evaluateReferenceRelevance(
      input.references.length,
      plan.referenceAssessment,
    );
    if (relevance === "missing") {
      throw new StoryboardGenerationError("INVALID_RESPONSE");
    }
    if (relevance === "not_relevant") {
      throw new StoryboardGenerationError("REFERENCE_NOT_RELEVANT");
    }
    if (!plan.scenes.length) {
      throw new StoryboardGenerationError("INVALID_RESPONSE");
    }
    storyboard = compileProviderPlan(input, plan);
  } catch (error) {
    if (error instanceof StoryboardGenerationError) throw error;
    throw new StoryboardGenerationError("INVALID_RESPONSE", undefined, {
      cause: error,
    });
  }
  if (storyboard.project.inputMode !== input.inputMode) {
    throw new StoryboardGenerationError("INVALID_RESPONSE");
  }
  if (storyboard.video.targetDurationSeconds !== duration) {
    throw new StoryboardGenerationError("INVALID_RESPONSE");
  }
  if (input.inputMode === "SCRIPT") {
    const narration = storyboard.scenes
      .map((scene) => scene.narration)
      .join(" ");
    if (normalizeScript(narration) !== normalizeScript(input.content)) {
      throw new StoryboardGenerationError("INVALID_RESPONSE");
    }
  }
  return {
    storyboard,
    provider: "GOOGLE_GEMINI",
    model: selectedModel,
    generatedAt: new Date().toISOString(),
  };
};

export const generateStoryboardFromTopic = async (
  topic: string,
  options: { templateGuidance?: string } = {},
): Promise<Storyboard> => {
  const { apiKey, model } = getGeminiConfig();
  const client = createGeminiClient(apiKey);
  const request = {
    model,
    contents: `Create a five-scene, 30-second vertical educational explainer storyboard about: ${topic}.
Give every scene a concise on-screen title.
${options.templateGuidance ?? "Choose the templates that best communicate the topic."}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(storyboardSchema),
      temperature: 0.35,
    },
  };

  let response:
    Awaited<ReturnType<typeof client.models.generateContent>> | undefined;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await client.models.generateContent(request);
      break;
    } catch (error) {
      const status =
        typeof error === "object" && error && "status" in error
          ? Number(error.status)
          : undefined;
      const retryable = status === 429 || status === 503 || status === 504;
      if (!retryable || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }

  if (!response?.text) {
    throw new Error("Gemini returned no storyboard text.");
  }
  return storyboardSchema.parse(JSON.parse(response.text));
};
