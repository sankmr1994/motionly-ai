import { describe, expect, it } from "vitest";
import { buildOwnedProjectsFilter } from "./projects";

describe("project ownership filter", () => {
  it("always scopes project lists to the authenticated owner", () => {
    expect(buildOwnedProjectsFilter("user-a")).toEqual({
      ownerId: "user-a",
      status: { $ne: "DELETING" },
    });
    expect(buildOwnedProjectsFilter("user-b")).not.toEqual(
      buildOwnedProjectsFilter("user-a"),
    );
  });

  it("rejects an empty owner instead of issuing an unscoped query", () => {
    expect(() => buildOwnedProjectsFilter("   ")).toThrow(
      "A project owner is required.",
    );
  });
});
