import { describe, expect, it } from "vitest";
import {
  buildOwnedProjectsFilter,
  getPlanningReadiness,
  getRevisionSelectionReadiness,
} from "./projects";

describe("project ownership filter", () => {
  it("always scopes project lists to the authenticated owner", () => {
    expect(buildOwnedProjectsFilter("user-a")).toEqual({
      ownerId: "user-a",
      status: { $nin: ["ARCHIVED", "DELETING"] },
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

  it("separates archived projects without dropping owner scope", () => {
    expect(buildOwnedProjectsFilter("user-a", true)).toEqual({
      ownerId: "user-a",
      status: "ARCHIVED",
    });
  });
});

describe("project planning readiness", () => {
  it("allows initial planning and regeneration from review", () => {
    expect(getPlanningReadiness("DRAFT")).toBe("ready");
    expect(getPlanningReadiness("REVIEW_READY")).toBe("ready");
  });

  it("prevents duplicate and invalid planning transitions", () => {
    expect(getPlanningReadiness("PLANNING")).toBe("already_planning");
    expect(getPlanningReadiness("APPROVED")).toBe("not_ready");
    expect(getPlanningReadiness("ARCHIVED")).toBe("not_ready");
  });
});

describe("storyboard revision selection readiness", () => {
  it("selects only a historical revision while the project is in review", () => {
    expect(getRevisionSelectionReadiness("REVIEW_READY", false)).toBe("ready");
    expect(getRevisionSelectionReadiness("REVIEW_READY", true)).toBe("current");
  });

  it("blocks selection during planning and after approval", () => {
    expect(getRevisionSelectionReadiness("PLANNING", false)).toBe("busy");
    expect(getRevisionSelectionReadiness("APPROVED", false)).toBe("not_ready");
  });
});
