import { describe, expect, it } from "vitest";
import {
  getInstagramReelThumbnailOffset,
  isInstagramReelCompatible,
} from "./instagram-publishing";

const approvedRender = {
  mimeType: "video/mp4",
  width: 720,
  height: 1280,
  fps: 30,
  durationSeconds: 45,
  byteLength: 12_000_000,
};

describe("Instagram Reel compatibility", () => {
  it("accepts Motionly's approved vertical MP4 contract", () => {
    expect(isInstagramReelCompatible(approvedRender)).toBe(true);
  });

  it("rejects unsupported dimensions, duration, frame rate, and size", () => {
    expect(isInstagramReelCompatible({ ...approvedRender, width: 1080 })).toBe(
      false,
    );
    expect(
      isInstagramReelCompatible({ ...approvedRender, durationSeconds: 2 }),
    ).toBe(false);
    expect(isInstagramReelCompatible({ ...approvedRender, fps: 61 })).toBe(
      false,
    );
    expect(
      isInstagramReelCompatible({
        ...approvedRender,
        byteLength: 1_000_000_001,
      }),
    ).toBe(false);
  });
});

describe("Instagram Reel thumbnail selection", () => {
  it("selects a representative frame after Motionly's opening transition", () => {
    expect(getInstagramReelThumbnailOffset(45)).toBe("3000");
    expect(getInstagramReelThumbnailOffset(30)).toBe("3000");
    expect(getInstagramReelThumbnailOffset(12)).toBe("1200");
  });

  it("always stays at least one second into a short compatible Reel", () => {
    expect(getInstagramReelThumbnailOffset(3)).toBe("1000");
  });
});
