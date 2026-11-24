import { describe, expect, it } from "vitest";
import { createVideoPosterDataUrl } from "./video-poster";

describe("video poster", () => {
  it("creates a safe, topic-aware SVG poster", () => {
    const poster = decodeURIComponent(
      createVideoPosterDataUrl("How rainbows <really> form", 45),
    );

    expect(poster).toContain("data:image/svg+xml,");
    expect(poster).toContain("How rainbows");
    expect(poster).toContain("&lt;really&gt;");
    expect(poster).toContain("#ff5577");
    expect(poster).toContain("45s · 9:16");
  });
});
