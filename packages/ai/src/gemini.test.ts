import { describe, expect, it } from "vitest";
import { evaluateReferenceRelevance } from "./gemini";

describe("reference relevance gate", () => {
  it("does not require an assessment when no reference was submitted", () => {
    expect(evaluateReferenceRelevance(0, undefined)).toBe("not_required");
  });

  it("requires an explicit assessment for a referenced storyboard", () => {
    expect(evaluateReferenceRelevance(1, undefined)).toBe("missing");
  });

  it("accepts matching references and rejects unrelated references", () => {
    expect(
      evaluateReferenceRelevance(1, {
        relevant: true,
        reason: "The article directly explains compound interest.",
      }),
    ).toBe("relevant");
    expect(
      evaluateReferenceRelevance(1, {
        relevant: false,
        reason: "The article is about solar eclipses.",
      }),
    ).toBe("not_relevant");
  });
});
