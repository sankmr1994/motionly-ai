import { describe, expect, it } from "vitest";
import { getNarrationReadiness } from "./narrations";

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
