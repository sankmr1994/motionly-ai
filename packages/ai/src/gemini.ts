import { GoogleGenAI } from "@google/genai";
import { storyboardSchema, type Storyboard } from "@motionly/shared";
import { z } from "zod";
import { getGeminiConfig } from "./env";

const systemInstruction = `You create concise educational explainer storyboards for Motionly AI.
Return only data matching the supplied JSON schema.
Use only the declared templates and animation actions.
All scene durations must total exactly 30 seconds.
Never emit executable code, HTML, JavaScript, URLs, or arbitrary component names.
Diagrams and quantitative displays must be accurate and clearly labeled.`;

export const generateStoryboardFromTopic = async (
  topic: string,
  options: { templateGuidance?: string } = {},
): Promise<Storyboard> => {
  const { apiKey, model } = getGeminiConfig();
  const client = new GoogleGenAI({ apiKey });
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
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await client.models.generateContent(request);
      break;
    } catch (error) {
      const status =
        typeof error === "object" && error && "status" in error
          ? Number(error.status)
          : undefined;
      const retryable = status === 429 || status === 503;
      if (!retryable || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }

  if (!response?.text) {
    throw new Error("Gemini returned no storyboard text.");
  }
  return storyboardSchema.parse(JSON.parse(response.text));
};
