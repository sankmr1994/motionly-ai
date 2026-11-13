import { describe, expect, it } from "vitest";
import {
  buildOwnedProjectsFilter,
  compileStoryboardTextEdits,
  getPlanningReadiness,
  getRevisionSelectionReadiness,
} from "./projects";
import { solarEclipseStoryboard } from "@motionly/shared/fixtures/solar-eclipse";

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

describe("storyboard text edit compiler", () => {
  const edits = solarEclipseStoryboard.scenes.map((scene, index) => ({
    id: scene.id,
    title: scene.title ?? `Scene ${index + 1}`,
    narration: scene.narration,
  }));

  it("changes only editable text and reports the diff", () => {
    const revised = structuredClone(edits);
    revised[0]!.title = "A revised eclipse opening";
    revised[0]!.narration = "The Moon moves between Earth and the Sun.";
    const result = compileStoryboardTextEdits(solarEclipseStoryboard, revised);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changedScenes).toBe(1);
    expect(result.titleChanges).toBe(1);
    expect(result.narrationChanges).toBe(1);
    expect(result.storyboard.scenes[0]!.template).toBe(
      solarEclipseStoryboard.scenes[0]!.template,
    );
  });

  it("rejects missing scenes and narration that exceeds timing", () => {
    expect(
      compileStoryboardTextEdits(solarEclipseStoryboard, edits.slice(1)),
    ).toMatchObject({ ok: false, reason: "scene_mismatch" });
    const tooLong = structuredClone(edits);
    tooLong[0]!.narration = Array.from({ length: 100 }, () => "word").join(" ");
    expect(
      compileStoryboardTextEdits(solarEclipseStoryboard, tooLong),
    ).toMatchObject({ ok: false, reason: "timing" });
  });
});
