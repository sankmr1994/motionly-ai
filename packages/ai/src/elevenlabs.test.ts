import { describe, expect, it } from "vitest";
import { getSpeechDurationSeconds } from "./elevenlabs";

describe("ElevenLabs speech metadata", () => {
  it("uses normalized timestamp alignment for audio duration", () => {
    expect(
      getSpeechDurationSeconds({
        audio: new Uint8Array([1]),
        alignment: null,
        normalizedAlignment: {
          characters: ["H", "i"],
          character_start_times_seconds: [0, 0.1],
          character_end_times_seconds: [0.1, 0.24],
        },
      }),
    ).toBe(0.24);
  });

  it("returns zero when the provider omits alignment", () => {
    expect(
      getSpeechDurationSeconds({
        audio: new Uint8Array([1]),
        alignment: null,
        normalizedAlignment: null,
      }),
    ).toBe(0);
  });
});
