import {
  compoundInterestStoryboard,
  solarEclipseStoryboard,
  type Storyboard,
} from "@motionly/shared";
import {
  resolveVisualDomain,
  shouldUseCelestialDiagram,
  shouldUseFinanceVisual,
} from "@motionly/video";
import { describe, expect, it } from "vitest";

const transformerStoryboard: Storyboard = {
  schemaVersion: "0.1",
  project: {
    name: "Motionly AI",
    inputMode: "TOPIC",
    topic: "Explain AI transformer architecture",
    contentType: "EXPLAINER",
  },
  video: {
    width: 720,
    height: 1280,
    fps: 30,
    targetDurationSeconds: 30,
    style: "CLEAN_2D_EDUCATIONAL",
  },
  scenes: [
    {
      id: "scene_01",
      title: "Self-attention mechanism",
      durationEstimateSeconds: 30,
      template: "DIAGRAM",
      narration:
        "Tokens connect through self-attention inside the language model.",
      objects: ["tokens", "attention", "context", "output"],
      actions: [{ type: "SHOW", targets: ["tokens", "attention"] }],
    },
  ],
};

describe("topic-compatible visual routing", () => {
  it("never routes a transformer diagram to the eclipse visual", () => {
    const scene = transformerStoryboard.scenes[0]!;
    const domain = resolveVisualDomain(transformerStoryboard, scene);
    expect(domain).toBe("AI");
    expect(shouldUseCelestialDiagram(domain, scene.template)).toBe(false);
    expect(shouldUseFinanceVisual(domain, "GROWTH_CHART")).toBe(false);
  });

  it("preserves the intentional eclipse and finance visual families", () => {
    const eclipseScene = solarEclipseStoryboard.scenes[0]!;
    const eclipseDomain = resolveVisualDomain(
      solarEclipseStoryboard,
      eclipseScene,
    );
    expect(eclipseDomain).toBe("SPACE");
    expect(
      shouldUseCelestialDiagram(eclipseDomain, eclipseScene.template),
    ).toBe(true);

    const financeScene = compoundInterestStoryboard.scenes[2]!;
    const financeDomain = resolveVisualDomain(
      compoundInterestStoryboard,
      financeScene,
    );
    expect(financeDomain).toBe("FINANCE");
    expect(shouldUseFinanceVisual(financeDomain, financeScene.template)).toBe(
      true,
    );
  });
});
