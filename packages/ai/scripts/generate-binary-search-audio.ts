import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { binarySearchStoryboard } from "@motionly/shared";
import { generateNarratedVideoAssets } from "../src/narrated-video";

loadEnvFile(resolve(process.cwd(), ".env.local"));

console.log(
  JSON.stringify(
    await generateNarratedVideoAssets(binarySearchStoryboard, "binary-search"),
  ),
);
