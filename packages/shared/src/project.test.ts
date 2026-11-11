import { describe, expect, it } from "vitest";
import { createProjectRequestSchema } from "./project";

const video = {
  width: 720,
  height: 1280,
  fps: 30,
  targetDurationSeconds: 45,
  style: "CLEAN_2D_EDUCATIONAL",
} as const;

describe("project contract", () => {
  it("accepts a topic-mode draft", () => {
    expect(
      createProjectRequestSchema.safeParse({
        title: "How habits form",
        inputMode: "TOPIC",
        topic: "Explain how habits form",
        video,
      }).success,
    ).toBe(true);
  });

  it("accepts a script-mode draft", () => {
    expect(
      createProjectRequestSchema.safeParse({
        title: "Habit loop script",
        inputMode: "SCRIPT",
        sourceScript: "A cue starts every habit loop.",
        video,
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched input fields", () => {
    expect(
      createProjectRequestSchema.safeParse({
        title: "Mismatched draft",
        inputMode: "TOPIC",
        sourceScript: "This field is not valid in topic mode.",
        video,
      }).success,
    ).toBe(false);
  });
});
