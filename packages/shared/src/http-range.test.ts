import { describe, expect, it } from "vitest";
import { parseSingleByteRange } from "./http-range";

describe("single HTTP byte ranges", () => {
  it("parses bounded and open-ended ranges", () => {
    expect(parseSingleByteRange("bytes=10-19", 100)).toEqual({
      start: 10,
      end: 19,
    });
    expect(parseSingleByteRange("bytes=90-", 100)).toEqual({
      start: 90,
      end: 99,
    });
  });

  it("parses suffix ranges", () => {
    expect(parseSingleByteRange("bytes=-10", 100)).toEqual({
      start: 90,
      end: 99,
    });
    expect(parseSingleByteRange("bytes=-200", 100)).toEqual({
      start: 0,
      end: 99,
    });
  });

  it("rejects invalid or unsatisfiable ranges", () => {
    expect(parseSingleByteRange("bytes=-", 100)).toBeNull();
    expect(parseSingleByteRange("bytes=100-", 100)).toBeNull();
    expect(parseSingleByteRange("bytes=20-10", 100)).toBeNull();
    expect(parseSingleByteRange("bytes=0-1,4-5", 100)).toBeNull();
  });
});
