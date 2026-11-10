import { storyboardSchema } from "../storyboard";

export const binarySearchStoryboard = storyboardSchema.parse({
  schemaVersion: "0.1",
  project: {
    name: "Motionly AI",
    inputMode: "TOPIC",
    topic: "How does binary search work?",
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
      title: "Start with sorted data",
      durationEstimateSeconds: 6,
      template: "SORTED_ARRAY",
      narration:
        "Binary search finds a value in sorted data. Let us look for twenty-three in this ordered array.",
      objects: ["sorted_array", "target"],
      actions: [
        { type: "SHOW", targets: ["sorted_array"], sequence: "STAGGERED" },
        { type: "HIGHLIGHT", target: "target" },
      ],
    },
    {
      id: "scene_02",
      title: "Check the middle",
      durationEstimateSeconds: 6,
      template: "MIDPOINT",
      narration:
        "First, check the middle value: seventeen. Our target is larger, so it must be on the right.",
      objects: ["middle", "target", "right_half"],
      actions: [
        { type: "HIGHLIGHT", target: "middle" },
        { type: "MOVE", target: "search_range", to: "right_half" },
      ],
    },
    {
      id: "scene_03",
      title: "Discard half the array",
      durationEstimateSeconds: 6,
      template: "DISCARD_HALF",
      narration:
        "Everything at seventeen or below is discarded. One comparison has removed half of the possibilities.",
      objects: ["left_half", "right_half"],
      actions: [
        { type: "HIGHLIGHT", target: "left_half" },
        { type: "ZOOM", target: "right_half" },
      ],
    },
    {
      id: "scene_04",
      title: "Repeat and find the target",
      durationEstimateSeconds: 6,
      template: "FOUND_TARGET",
      narration:
        "Check thirty-one next. Twenty-three is smaller, so move left. The next middle value is our target.",
      objects: ["remaining_range", "thirty_one", "twenty_three"],
      actions: [
        { type: "HIGHLIGHT", target: "thirty_one" },
        { type: "HIGHLIGHT", target: "twenty_three" },
      ],
    },
    {
      id: "scene_05",
      title: "Why binary search is fast",
      durationEstimateSeconds: 6,
      template: "COMPLEXITY",
      narration:
        "Each step cuts the search space in half. That makes binary search logarithmic and extremely efficient on large sorted lists.",
      objects: ["search_space", "logarithmic_steps"],
      actions: [
        { type: "DRAW", target: "halving_sequence" },
        { type: "SHOW", targets: ["complexity_label"] },
      ],
    },
  ],
});
