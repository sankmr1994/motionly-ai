import { describe, expect, it } from "vitest";
import { getVideoRenderReadiness } from "./renders";

describe("video render readiness", () => {
  it("requires approved storyboard, completed narration, and approved captions", () => {
    expect(
      getVideoRenderReadiness("APPROVED", "APPROVED", "COMPLETED", "APPROVED"),
    ).toBe("ready");
  });

  it("blocks every incomplete review state", () => {
    expect(
      getVideoRenderReadiness("APPROVED", "APPROVED", "COMPLETED", "DRAFT"),
    ).toBe("not_ready");
    expect(
      getVideoRenderReadiness(
        "REVIEW_READY",
        "REVIEW_READY",
        "COMPLETED",
        "APPROVED",
      ),
    ).toBe("not_ready");
  });
});
