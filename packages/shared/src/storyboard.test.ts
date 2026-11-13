import { describe, expect, it } from "vitest";
import { solarEclipseStoryboard } from "./fixtures/solar-eclipse";
import { compileTimeline, storyboardSchema } from "./storyboard";

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
});
