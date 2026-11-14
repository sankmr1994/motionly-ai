import { describe, expect, it } from "vitest";
import { getCaptionTimingFit, getNarrationReadiness } from "./narrations";

describe("narration generation readiness", () => {
  it("accepts only the exact approved storyboard state", () => {
    expect(getNarrationReadiness("APPROVED", "APPROVED")).toBe("ready");
  });

  it("blocks drafts, review copies, and unapproved versions", () => {
    expect(getNarrationReadiness("REVIEW_READY", "REVIEW_READY")).toBe(
      "not_approved",
    );
    expect(getNarrationReadiness("DRAFT", "DRAFT")).toBe("not_approved");
    expect(getNarrationReadiness("APPROVED", "REVIEW_READY")).toBe(
      "not_approved",
    );
  });
});

describe("caption timing fit", () => {
  it("allows a small narration tail without warning", () => {
    const result = getCaptionTimingFit(7.9, 7.5);
    expect(result.fit).toBe("FITS");
    expect(result.timingDeltaSeconds).toBeCloseTo(0.4);
  });

  it("flags audio that exceeds the scene tolerance", () => {
    expect(getCaptionTimingFit(8.1, 7.5).fit).toBe("OVERRUN");
  });
});
