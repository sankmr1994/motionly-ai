import { describe, expect, it } from "vitest";
import { solarEclipseStoryboard } from "./fixtures/solar-eclipse";
import {
  compileTimeline,
  countNarrationWords,
  getNarrationTimingIssues,
  getNarrationWordLimit,
  storyboardSchema,
} from "./storyboard";

describe("storyboard contract", () => {
  it("validates the approved solar eclipse fixture", () => {
    expect(storyboardSchema.safeParse(solarEclipseStoryboard).success).toBe(
      true,
    );
  });

  it("compiles exactly 900 frames", () => {
    const timeline = compileTimeline(solarEclipseStoryboard);
    const last = timeline.at(-1);
    expect(last && last.fromFrame + last.durationInFrames).toBe(900);
  });

  it("rejects a storyboard whose scene durations do not total 30 seconds", () => {
    const invalid = structuredClone(solarEclipseStoryboard);
    invalid.scenes[0]!.durationEstimateSeconds = 4;
    expect(storyboardSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts a storyboard matching a 45-second project duration", () => {
    const storyboard = structuredClone(solarEclipseStoryboard);
    storyboard.video.targetDurationSeconds = 45;
    storyboard.scenes[0]!.durationEstimateSeconds = 20;
    expect(storyboardSchema.safeParse(storyboard).success).toBe(true);
  });

  it("detects narration that cannot fit its scene duration", () => {
    const storyboard = structuredClone(solarEclipseStoryboard);
    const duration = storyboard.scenes[0]!.durationEstimateSeconds;
    storyboard.scenes[0]!.narration = Array.from(
      { length: getNarrationWordLimit(duration) + 1 },
      () => "word",
    ).join(" ");
    expect(getNarrationTimingIssues(storyboard)).toContainEqual({
      sceneId: "scene_01",
      wordCount: getNarrationWordLimit(duration) + 1,
      maximumWords: getNarrationWordLimit(duration),
    });
    expect(countNarrationWords("  one   two three  ")).toBe(3);
  });
});
