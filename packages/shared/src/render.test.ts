import { describe, expect, it } from "vitest";
import { compoundInterestStoryboard } from "./fixtures/compound-interest";
import { compileApprovedRenderTimeline } from "./render";

describe("approved render timeline", () => {
  it("extends scenes to fit narration instead of cutting speech", () => {
    const first = compoundInterestStoryboard.scenes[0]!;
    const timeline = compileApprovedRenderTimeline({
      storyboard: compoundInterestStoryboard,
      audioDurationsSeconds: {
        [first.id]: first.durationEstimateSeconds + 1.2,
      },
      captionStyle: "KARAOKE",
      captionScenes: [],
    });
    expect(timeline.sceneDurationsSeconds[first.id]).toBe(
      first.durationEstimateSeconds + 1.2,
    );
    expect(timeline.durationInFrames).toBeGreaterThan(
      compoundInterestStoryboard.video.targetDurationSeconds * 30,
    );
  });

  it("converts scene-relative cues into exact global frames", () => {
    const first = compoundInterestStoryboard.scenes[0]!;
    const second = compoundInterestStoryboard.scenes[1]!;
    const timeline = compileApprovedRenderTimeline({
      storyboard: compoundInterestStoryboard,
      audioDurationsSeconds: {},
      captionStyle: "MINIMAL",
      captionScenes: [
        {
          sceneId: second.id,
          cues: [
            {
              id: "cue",
              startSeconds: 0.5,
              endSeconds: 1.5,
              text: "Second scene",
            },
          ],
        },
      ],
    });
    const cue = timeline.captions[0];
    expect(cue?.startFrame).toBe(first.durationEstimateSeconds * 30 + 15);
    expect(cue?.endFrame).toBe(first.durationEstimateSeconds * 30 + 45);
  });

  it("never emits a caption beyond its rendered scene", () => {
    const first = compoundInterestStoryboard.scenes[0]!;
    const timeline = compileApprovedRenderTimeline({
      storyboard: compoundInterestStoryboard,
      audioDurationsSeconds: {},
      captionStyle: "BOLD",
      captionScenes: [
        {
          sceneId: first.id,
          cues: [
            { id: "cue", startSeconds: 0, endSeconds: 99, text: "Bounded" },
          ],
        },
      ],
    });
    expect(timeline.captions[0]?.endFrame).toBe(
      Math.ceil(first.durationEstimateSeconds * 30),
    );
  });
});
