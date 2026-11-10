import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { compoundInterestStoryboard } from "@motionly/shared";
import { generateStoryboardFromTopic } from "../src/gemini";

loadEnvFile(resolve(process.cwd(), ".env.local"));

const useFallback = process.argv.includes("--fallback");
const storyboard = useFallback
  ? compoundInterestStoryboard
  : await generateStoryboardFromTopic(
      "How does compound interest grow your money? Use a $1,000 starting balance and a 10% annual return for the numerical example.",
      {
        templateGuidance:
          "Use only NUMBER_FLOW, FORMULA, GROWTH_CHART, and COMPARISON templates. Keep narration under 85 total words. Use mathematically correct values: $1,100 after year one, $1,210 after year two, and $1,331 after year three.",
      },
    );

const directory = resolve(process.cwd(), "storage", "compound-interest");
await mkdir(directory, { recursive: true });
await writeFile(
  resolve(directory, "storyboard.json"),
  JSON.stringify(storyboard, null, 2),
);

console.log(
  JSON.stringify({
    topic: storyboard.project.topic,
    scenes: storyboard.scenes.length,
    narrationWords: storyboard.scenes
      .map((scene) => scene.narration)
      .join(" ")
      .split(/\s+/).length,
    source: useFallback ? "validated-fallback" : "gemini",
    output: "storage/compound-interest/storyboard.json",
  }),
);
