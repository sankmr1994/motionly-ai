import { describe, expect, it } from "vitest";
import {
  createNarrationAssetKey,
  createReadableProjectSlug,
  createRenderedVideoAssetKey,
  createSceneVisualAssetKey,
} from "./media-storage";

describe("readable media object keys", () => {
  it("creates a bounded readable project slug", () => {
    expect(createReadableProjectSlug("Explain Compound Interest! ")).toBe(
      "explain-compound-interest",
    );
    expect(createReadableProjectSlug("தமிழ் சேமிப்பு விளக்கம்")).toBe(
      "தமிழ்-சேமிப்பு-விளக்கம்",
    );
  });

  it("keeps project, revision, job, and scene identity in narration keys", () => {
    expect(
      createNarrationAssetKey({
        ownerId: "user123",
        projectId: "project123",
        projectTitle: "Compound Interest",
        revision: 3,
        jobId: "narration456",
        sceneId: "scene-01",
      }),
    ).toBe(
      "users/user123/projects/compound-interest--project123/revision-3/narration/narration456/scene-01.mp3",
    );
  });

  it("creates readable render keys", () => {
    expect(
      createRenderedVideoAssetKey({
        ownerId: "user123",
        projectId: "project123",
        projectTitle: "Binary Search",
        revision: 2,
        jobId: "render789",
      }),
    ).toBe(
      "users/user123/projects/binary-search--project123/revision-2/video/render789/motionly-video.mp4",
    );
  });

  it("creates revision-scoped scene artwork keys", () => {
    expect(
      createSceneVisualAssetKey({
        ownerId: "user123",
        projectId: "project123",
        projectTitle: "How Rainbows Form",
        revision: 4,
        versionId: "version456",
        sceneId: "scene-02",
        promptHash: "a".repeat(64),
        extension: "png",
      }),
    ).toBe(
      "users/user123/projects/how-rainbows-form--project123/revision-4/visuals/version456/scene-02-aaaaaaaaaaaaaaaaaaaa.png",
    );
  });
});
