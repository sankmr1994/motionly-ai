import { storyboardSchema } from "../storyboard";

export const solarEclipseStoryboard = storyboardSchema.parse({
  schemaVersion: "0.1",
  project: {
    name: "Motionly AI",
    inputMode: "TOPIC",
    topic: "How does a solar eclipse happen?",
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
      durationEstimateSeconds: 5,
      template: "DIAGRAM",
      narration:
        "Ever wondered how a solar eclipse happens? It starts with the Sun, Moon, and Earth.",
      objects: ["sun", "moon", "earth"],
      actions: [
        {
          type: "SHOW",
          targets: ["sun", "moon", "earth"],
          sequence: "STAGGERED",
        },
        { type: "LABEL", targets: ["sun", "moon", "earth"] },
      ],
    },
    {
      id: "scene_02",
      durationEstimateSeconds: 7,
      template: "DIAGRAM",
      narration:
        "When the Moon passes directly between the Sun and Earth, it blocks some sunlight.",
      objects: ["sun", "moon", "earth", "sunlight"],
      actions: [
        {
          type: "MOVE",
          target: "moon",
          to: "BETWEEN_SUN_AND_EARTH",
          cue: "between the Sun and Earth",
        },
        {
          type: "HIGHLIGHT",
          target: "sunlight",
          cue: "blocks some sunlight",
        },
      ],
    },
    {
      id: "scene_03",
      durationEstimateSeconds: 7,
      template: "SHADOW_DIAGRAM",
      narration:
        "The Moon casts a shadow on Earth. Inside its darkest part, the Sun can appear completely covered.",
      objects: ["sun", "moon", "earth", "umbra"],
      actions: [
        { type: "DRAW", target: "umbra", cue: "casts a shadow" },
        {
          type: "HIGHLIGHT",
          target: "umbra",
          cue: "darkest part",
        },
      ],
    },
    {
      id: "scene_04",
      durationEstimateSeconds: 6,
      template: "ECLIPSE_VIEW",
      narration:
        "From that narrow area, you can witness a total solar eclipse, with the Sun's corona glowing around the Moon.",
      objects: ["moon", "sun", "corona"],
      actions: [
        {
          type: "ZOOM",
          target: "eclipse_view",
          cue: "total solar eclipse",
        },
        { type: "SHOW", targets: ["corona"], cue: "corona glowing" },
      ],
    },
    {
      id: "scene_05",
      durationEstimateSeconds: 5,
      template: "DIAGRAM",
      narration:
        "So, a solar eclipse happens when the Moon blocks sunlight along a narrow path on Earth.",
      objects: ["sun", "moon", "earth", "shadow"],
      actions: [
        { type: "SHOW", targets: ["sun", "moon", "earth"] },
        {
          type: "HIGHLIGHT",
          target: "shadow",
          cue: "narrow path on Earth",
        },
      ],
    },
  ],
});
