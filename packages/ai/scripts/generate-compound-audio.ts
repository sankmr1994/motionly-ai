import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { storyboardSchema } from "@motionly/shared";
import { generateNarratedVideoAssets } from "../src/narrated-video";

loadEnvFile(resolve(process.cwd(), ".env.local"));

const storyboard = storyboardSchema.parse(
  JSON.parse(
    await readFile(
      resolve(process.cwd(), "storage", "compound-interest", "storyboard.json"),
      "utf8",
    ),
  ),
);

console.log(
  JSON.stringify(
    await generateNarratedVideoAssets(storyboard, "compound-interest"),
  ),
);
