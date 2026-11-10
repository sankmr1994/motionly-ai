import { storyboardSchema } from "../storyboard";

export const compoundInterestStoryboard = storyboardSchema.parse({
  schemaVersion: "0.1",
  project: {
    name: "Motionly AI",
    inputMode: "TOPIC",
    topic: "How does compound interest grow your money?",
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
      title: "Your money starts working",
      durationEstimateSeconds: 6,
      template: "NUMBER_FLOW",
      narration:
        "Start with one thousand dollars earning ten percent a year. After year one, you have eleven hundred.",
      objects: ["starting_balance", "interest", "year_one_balance"],
      actions: [
        { type: "SHOW", targets: ["starting_balance", "interest"] },
        { type: "MOVE", target: "interest", to: "year_one_balance" },
      ],
    },
    {
      id: "scene_02",
      title: "Interest joins the balance",
      durationEstimateSeconds: 6,
      template: "FORMULA",
      narration:
        "In year two, interest is calculated on the full eleven hundred, not just the original deposit.",
      objects: ["balance", "rate", "formula"],
      actions: [
        { type: "SHOW", targets: ["balance", "rate"] },
        { type: "HIGHLIGHT", target: "formula" },
      ],
    },
    {
      id: "scene_03",
      title: "Growth builds on growth",
      durationEstimateSeconds: 6,
      template: "GROWTH_CHART",
      narration:
        "That earns one hundred ten dollars, reaching twelve hundred ten. Year three grows to thirteen hundred thirty-one.",
      objects: ["year_one", "year_two", "year_three"],
      actions: [
        { type: "DRAW", target: "growth_bars" },
        { type: "LABEL", targets: ["year_one", "year_two", "year_three"] },
      ],
    },
    {
      id: "scene_04",
      title: "Why compounding accelerates",
      durationEstimateSeconds: 6,
      template: "COMPARISON",
      narration:
        "Simple interest adds the same amount each year. Compound interest accelerates because every gain joins the balance.",
      objects: ["simple_growth", "compound_growth"],
      actions: [
        { type: "DRAW", target: "comparison_lines" },
        { type: "HIGHLIGHT", target: "compound_growth" },
      ],
    },
    {
      id: "scene_05",
      title: "Time is the multiplier",
      durationEstimateSeconds: 6,
      template: "COMPARISON",
      narration:
        "More time means more compounding. Start early, stay invested, and let growth build on growth.",
      objects: ["time", "compound_growth"],
      actions: [
        { type: "ZOOM", target: "compound_growth" },
        { type: "HIGHLIGHT", target: "time" },
      ],
    },
  ],
});
