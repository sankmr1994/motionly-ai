import type { Storyboard, StoryboardScene } from "@motionly/shared";

export type VisualDomain =
  "AI" | "SPACE" | "FINANCE" | "ALGORITHM" | "NATURE" | "HABIT" | "GENERAL";

const domainPatterns: Array<[VisualDomain, RegExp]> = [
  [
    "AI",
    /\b(ai|artificial intelligence|transformer|attention|neural|language model|machine learning|deep learning|token)\b/iu,
  ],
  [
    "SPACE",
    /\b(eclipse|solar|lunar|sun|moon|earth|planet|orbit|space|galaxy|star)\b/iu,
  ],
  [
    "FINANCE",
    /\b(money|interest|finance|invest|saving|deposit|balance|revenue|profit|compound|dollar|rupee)\b/iu,
  ],
  [
    "ALGORITHM",
    /\b(algorithm|binary search|search|array|code|program|data structure|sorting|complexity)\b/iu,
  ],
  [
    "NATURE",
    /\b(rainbow|colour|color|light|weather|water|plant|nature|climate|spectrum)\b/iu,
  ],
  [
    "HABIT",
    /\b(habit|routine|focus|memory|learn|practice|behavior|behaviour|motivation)\b/iu,
  ],
];

export function resolveVisualDomain(
  storyboard: Storyboard,
  scene: StoryboardScene,
): VisualDomain {
  const projectText =
    storyboard.project.topic ?? storyboard.project.sourceScript ?? "";
  const sceneText = [
    scene.title,
    scene.narration,
    ...scene.objects,
    projectText,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    domainPatterns.find(([, pattern]) => pattern.test(sceneText))?.[0] ??
    "GENERAL"
  );
}

export function shouldUseCelestialDiagram(
  domain: VisualDomain,
  template: StoryboardScene["template"],
) {
  return (
    domain === "SPACE" &&
    ["DIAGRAM", "SHADOW_DIAGRAM", "ECLIPSE_VIEW"].includes(template)
  );
}

export function shouldUseFinanceVisual(
  domain: VisualDomain,
  template: StoryboardScene["template"],
) {
  return (
    domain === "FINANCE" &&
    ["NUMBER_FLOW", "FORMULA", "GROWTH_CHART", "COMPARISON"].includes(template)
  );
}

export function shouldUseOpticsVisual(
  domain: VisualDomain,
  scene: StoryboardScene,
) {
  const text = `${scene.title ?? ""} ${scene.narration} ${scene.objects.join(" ")}`;
  return (
    domain === "NATURE" &&
    /rainbow|refraction|spectrum|droplet|sunlight|light ray|colour|color/iu.test(
      text,
    )
  );
}

export function shouldUseTransformerVisual(
  domain: VisualDomain,
  scene: StoryboardScene,
) {
  const text = `${scene.title ?? ""} ${scene.narration} ${scene.objects.join(" ")}`;
  return (
    domain === "AI" &&
    /transformer|attention|token|language model|embedding|context|parallel/iu.test(
      text,
    )
  );
}
