import { describe, expect, it } from "vitest";
import {
  getVideoRenderReadiness,
  hasReachedPortfolioRenderLimit,
} from "./renders";

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

describe("portfolio render limit", () => {
  it("blocks public rendering at the configured completed-video limit", () => {
    expect(hasReachedPortfolioRenderLimit(2, 3)).toBe(false);
    expect(hasReachedPortfolioRenderLimit(3, 3)).toBe(true);
  });

  it("keeps administrator rendering unlimited", () => {
    expect(hasReachedPortfolioRenderLimit(100, undefined)).toBe(false);
  });
});
