import { describe, expect, it } from "vitest";
import {
  extractGroundedSources,
  getProviderErrorStatus,
} from "./trending-topics";

describe("extractGroundedSources", () => {
  it("keeps unique HTTPS sources and search queries", () => {
    expect(
      extractGroundedSources([
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { title: "Source A", uri: "https://example.com/a" } },
              { web: { title: "Duplicate", uri: "https://example.com/a" } },
              { web: { title: "Unsafe", uri: "http://example.com/b" } },
            ],
            webSearchQueries: [" latest topic ", ""],
          },
        },
      ]),
    ).toEqual({
      sources: [{ title: "Source A", url: "https://example.com/a" }],
      searchQueries: ["latest topic"],
    });
  });

  it("returns empty grounding for missing candidates", () => {
    expect(extractGroundedSources(undefined)).toEqual({
      sources: [],
      searchQueries: [],
    });
  });
});

describe("getProviderErrorStatus", () => {
  it("reads the Google API status from a serialized provider error", () => {
    expect(
      getProviderErrorStatus(
        new Error(JSON.stringify({ error: { code: 429 } })),
      ),
    ).toBe(429);
  });

  it("returns undefined for an unrelated error", () => {
    expect(
      getProviderErrorStatus(new Error("network failure")),
    ).toBeUndefined();
  });
});
