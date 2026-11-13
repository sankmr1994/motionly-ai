import { describe, expect, it } from "vitest";
import {
  approveProjectVersionRequestSchema,
  createProjectRequestSchema,
  updateProjectRequestSchema,
} from "./project";

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

  it("validates project rename and archive updates", () => {
    expect(
      updateProjectRequestSchema.safeParse({ title: "New title" }).success,
    ).toBe(true);
    expect(
      updateProjectRequestSchema.safeParse({ archived: true }).success,
    ).toBe(true);
    expect(updateProjectRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("project approval contract", () => {
  it("requires explicit confirmation and the reviewed SHA-256 hash", () => {
    expect(
      approveProjectVersionRequestSchema.safeParse({
        contentHash: `sha256:${"a".repeat(64)}`,
        confirmation: "APPROVE",
      }).success,
    ).toBe(true);
    expect(
      approveProjectVersionRequestSchema.safeParse({
        contentHash: "sha256:wrong",
        confirmation: "APPROVE",
      }).success,
    ).toBe(false);
  });
});
