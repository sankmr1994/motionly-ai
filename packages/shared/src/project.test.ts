import { describe, expect, it } from "vitest";
import {
  approveProjectVersionRequestSchema,
  changeProjectReferenceRequestSchema,
  createProjectRequestSchema,
  editProjectStoryboardRequestSchema,
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

  it("accepts a public HTTPS reference and rejects unsafe reference URLs", () => {
    const draft = {
      title: "How compound interest works",
      inputMode: "TOPIC" as const,
      topic: "Explain compound interest to a beginner",
      video,
    };
    expect(
      createProjectRequestSchema.safeParse({
        ...draft,
        references: [{ url: "https://www.investor.gov/compound-interest" }],
      }).success,
    ).toBe(true);
    for (const url of [
      "http://example.com/article",
      "https://localhost:3000/private",
      "https://127.0.0.1/private",
      "https://[::1]/private",
      "https://user:secret@example.com/article",
    ]) {
      expect(
        createProjectRequestSchema.safeParse({
          ...draft,
          references: [{ url }],
        }).success,
      ).toBe(false);
    }
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

describe("storyboard edit contract", () => {
  const validEdit = {
    basedOnVersionId: "a".repeat(24),
    expectedContentHash: `sha256:${"b".repeat(64)}`,
    confirmation: "SAVE_EDITS",
    scenes: [
      {
        id: "scene_01",
        title: "A clearer opening",
        narration: "This is the revised narration.",
        objects: ["Main idea", "Supporting detail"],
      },
    ],
  };

  it("accepts explicitly confirmed title and narration edits", () => {
    expect(
      editProjectStoryboardRequestSchema.safeParse(validEdit).success,
    ).toBe(true);
  });

  it("accepts a safe reference as part of one combined edit revision", () => {
    expect(
      editProjectStoryboardRequestSchema.safeParse({
        ...validEdit,
        reference: { url: "https://www.investor.gov/compound-interest" },
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate scenes and missing confirmation", () => {
    expect(
      editProjectStoryboardRequestSchema.safeParse({
        ...validEdit,
        scenes: [...validEdit.scenes, validEdit.scenes[0]],
      }).success,
    ).toBe(false);
    expect(
      editProjectStoryboardRequestSchema.safeParse({
        ...validEdit,
        confirmation: undefined,
      }).success,
    ).toBe(false);
  });
});

describe("storyboard reference change contract", () => {
  it("requires a public HTTPS URL, current version, and explicit confirmation", () => {
    const request = {
      basedOnVersionId: "a".repeat(24),
      reference: { url: "https://www.investor.gov/compound-interest" },
      confirmation: "CHANGE_REFERENCE",
    };
    expect(changeProjectReferenceRequestSchema.safeParse(request).success).toBe(
      true,
    );
    expect(
      changeProjectReferenceRequestSchema.safeParse({
        ...request,
        reference: { url: "http://localhost:3000/private" },
      }).success,
    ).toBe(false);
    expect(
      changeProjectReferenceRequestSchema.safeParse({
        ...request,
        confirmation: undefined,
      }).success,
    ).toBe(false);
  });
});
