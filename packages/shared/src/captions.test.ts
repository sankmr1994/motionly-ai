import { describe, expect, it } from "vitest";
import {
  buildCaptionCues,
  captionEditsSchema,
  findActiveCaptionCue,
} from "./captions";

function alignmentFor(text: string) {
  const characters = [...text];
  return {
    characters,
    characterStartTimesSeconds: characters.map((_, index) => index * 0.04),
    characterEndTimesSeconds: characters.map(
      (_, index) => index * 0.04 + 0.035,
    ),
  };
}

describe("caption timing", () => {
  it("creates stable phrase cues from character alignment", () => {
    const cues = buildCaptionCues(
      "scene_01",
      alignmentFor("Compound interest helps your savings grow. Start early."),
    );
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({
      id: "scene_01_caption_01",
      text: "Compound interest helps your savings grow.",
      startSeconds: 0,
    });
    expect(cues[1]?.text).toBe("Start early.");
  });

  it("keeps long captions bounded for vertical video", () => {
    const cues = buildCaptionCues(
      "scene_02",
      alignmentFor(
        "This deliberately long sentence contains enough words to require several readable caption phrases",
      ),
    );
    expect(cues.length).toBeGreaterThan(1);
    expect(cues.every((cue) => cue.text.length <= 80)).toBe(true);
    expect(cues.every((cue) => cue.endSeconds > cue.startSeconds)).toBe(true);
  });

  it("rejects incomplete alignment instead of guessing timing", () => {
    expect(
      buildCaptionCues("scene_03", {
        characters: ["H", "i"],
        characterStartTimesSeconds: [0],
        characterEndTimesSeconds: [0.1, 0.2],
      }),
    ).toEqual([]);
  });

  it("validates bounded caption edits", () => {
    expect(
      captionEditsSchema.safeParse({
        jobId: "job",
        version: 1,
        style: "KARAOKE",
        cues: [{ id: "cue", text: "Readable caption" }],
      }).success,
    ).toBe(true);
    expect(
      captionEditsSchema.safeParse({
        jobId: "job",
        version: 1,
        style: "LOUD",
        cues: [{ id: "cue", text: "" }],
      }).success,
    ).toBe(false);
  });

  it("shows no caption during a timing gap", () => {
    const cues = [
      { id: "one", startSeconds: 0.1, endSeconds: 1.9, text: "First" },
      { id: "two", startSeconds: 2, endSeconds: 3.2, text: "Second" },
      { id: "three", startSeconds: 3.5, endSeconds: 5.2, text: "Third" },
    ];
    expect(findActiveCaptionCue(cues, 1)).toMatchObject({ id: "one" });
    expect(findActiveCaptionCue(cues, 1.9)).toBeUndefined();
    expect(findActiveCaptionCue(cues, 2)).toMatchObject({ id: "two" });
    expect(findActiveCaptionCue(cues, 3.35)).toBeUndefined();
    expect(findActiveCaptionCue(cues, 4)).toMatchObject({ id: "three" });
  });
});
