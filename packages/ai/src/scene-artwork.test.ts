import { describe, expect, it } from "vitest";
import {
  buildSceneArtworkPrompt,
  createSceneArtworkPromptHash,
} from "./scene-artwork";

const rainbowScene = {
  id: "scene_02" as const,
  title: "Light enters a droplet",
  durationEstimateSeconds: 6,
  template: "DIAGRAM" as const,
  narration:
    "White sunlight bends as it enters a raindrop and separates into different colours.",
  objects: ["sunlight", "water droplet", "refraction", "colour spectrum"],
  actions: [{ type: "SHOW" as const, targets: ["sunlight", "water droplet"] }],
};

describe("scene artwork prompts", () => {
  it("grounds the image in the exact scene instead of a generic template", () => {
    const prompt = buildSceneArtworkPrompt({
      projectTitle: "How rainbows form",
      projectTopic: "Explain how sunlight and water droplets create a rainbow",
      scene: rainbowScene,
    });
    expect(prompt).toContain("water droplet");
    expect(prompt).toContain("refraction");
    expect(prompt).toContain("color spectrum");
    expect(prompt).toContain("Do not include any words");
  });

  it("changes its cache key when the prompt or model changes", () => {
    const first = createSceneArtworkPromptHash({
      model: "image-a",
      prompt: "one",
    });
    expect(first).not.toBe(
      createSceneArtworkPromptHash({ model: "image-a", prompt: "two" }),
    );
    expect(first).not.toBe(
      createSceneArtworkPromptHash({ model: "image-b", prompt: "one" }),
    );
  });
});
