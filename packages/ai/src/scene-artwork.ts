import { GoogleGenAI } from "@google/genai";
import type { StoryboardScene } from "@motionly/shared";
import { createHash } from "node:crypto";
import { getGeminiImageConfig } from "./env";

export const SCENE_ARTWORK_PROMPT_VERSION = "2026-11-23.1";

export class SceneArtworkGenerationError extends Error {
  constructor(
    public readonly code:
      | "PROVIDER_REQUEST_FAILED"
      | "EMPTY_IMAGE"
      | "UNSUPPORTED_IMAGE"
      | "IMAGE_TOO_LARGE",
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "SceneArtworkGenerationError";
  }
}

export function buildSceneArtworkPrompt(input: {
  projectTitle: string;
  projectTopic: string;
  scene: StoryboardScene;
}) {
  const objects = input.scene.objects
    .map((object) => object.replaceAll("_", " "))
    .join(", ");
  return `Create one original vertical 9:16 educational motion-graphics illustration for a short explainer video.

Overall video topic: ${input.projectTopic}
Scene title: ${input.scene.title ?? "Untitled scene"}
Scene meaning: ${input.scene.narration}
Important visual subjects: ${objects}

Illustrate the actual physical, conceptual, or causal meaning of this exact scene. Do not substitute a generic infographic. For scientific processes, show the real mechanism visually—for example, refraction should visibly show light entering a water droplet and separating into a color spectrum. For technical topics, show the relevant system, components, connections, and information flow. Make this scene visually different from the other scenes while keeping one coherent series style.

Art direction: premium modern 2D editorial motion graphic, dark navy background, luminous cobalt/cyan/chartreuse accents with topic-appropriate colors, layered depth, clean shapes, cinematic lighting, strong central composition, generous safe margins, designed to support a slow camera move. No photorealism. No UI cards unless the scene is specifically about software interfaces.

Do not include any words, letters, numbers, labels, subtitles, captions, logos, watermarks, borders, or signatures. Do not depict unrelated astronomy, finance, charts, or generic business imagery. Keep the important subjects inside the center 70 percent so Motionly can overlay its own title and captions safely.

Internal project title for context only: ${input.projectTitle}`;
}

export function createSceneArtworkPromptHash(input: {
  model: string;
  prompt: string;
}) {
  return createHash("sha256")
    .update(`${SCENE_ARTWORK_PROMPT_VERSION}:${input.model}:${input.prompt}`)
    .digest("hex");
}

export async function generateSceneArtwork(input: {
  projectTitle: string;
  projectTopic: string;
  scene: StoryboardScene;
}) {
  const config = getGeminiImageConfig();
  const prompt = buildSceneArtworkPrompt(input);
  const promptHash = createSceneArtworkPromptHash({
    model: config.model,
    prompt,
  });
  const client = new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: { timeout: 90_000 },
  });
  let response: Awaited<ReturnType<typeof client.models.generateContent>>;
  try {
    response = await client.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "9:16", imageSize: "1K" },
      },
    });
  } catch (error) {
    throw new SceneArtworkGenerationError("PROVIDER_REQUEST_FAILED", {
      cause: error,
    });
  }

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data,
  );
  const data = imagePart?.inlineData?.data;
  const mimeType = imagePart?.inlineData?.mimeType?.toLowerCase();
  if (!data || !mimeType) {
    throw new SceneArtworkGenerationError("EMPTY_IMAGE");
  }
  if (!["image/png", "image/jpeg"].includes(mimeType)) {
    throw new SceneArtworkGenerationError("UNSUPPORTED_IMAGE");
  }
  const image = Buffer.from(data, "base64");
  if (image.byteLength < 10_000) {
    throw new SceneArtworkGenerationError("EMPTY_IMAGE");
  }
  if (image.byteLength > 15_000_000) {
    throw new SceneArtworkGenerationError("IMAGE_TOO_LARGE");
  }
  return {
    image: new Uint8Array(image),
    mimeType: mimeType as "image/png" | "image/jpeg",
    model: response.modelVersion ?? config.model,
    requestedModel: config.model,
    prompt,
    promptHash,
    promptVersion: SCENE_ARTWORK_PROMPT_VERSION,
  };
}
