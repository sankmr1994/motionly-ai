import type { Storyboard } from "@motionly/shared";
import { compileTimeline } from "@motionly/shared";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { CelestialDiagram } from "./CelestialDiagram";
import {
  BinarySearchVisual,
  type BinarySearchMode,
} from "./BinarySearchVisual";
import { EclipseView } from "./EclipseView";
import { FinanceVisual, type FinanceMode } from "./FinanceVisual";
import { colors } from "./theme";

export type MotionlyExplainerProps = {
  storyboard: Storyboard;
  audioFile?: string;
  audioPlaybackRate?: number;
  captions?: CaptionCue[];
};

export type CaptionCue = {
  sceneId: string;
  startFrame: number;
  endFrame: number;
  text: string;
};

const Scene = ({
  storyboard,
  index,
  sceneFromFrame,
  captions,
}: {
  storyboard: Storyboard;
  index: number;
  sceneFromFrame: number;
  captions?: CaptionCue[];
}) => {
  const scene = storyboard.scenes[index]!;
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const mode =
    index === 0
      ? "INTRO"
      : index === 1
        ? "ALIGN"
        : index === 2
          ? "SHADOW"
          : "RECAP";
  const globalFrame = sceneFromFrame + frame;
  const sceneCaptions = captions?.filter(
    (caption) =>
      caption.sceneId === scene.id &&
      globalFrame >= caption.startFrame - 5 &&
      globalFrame < caption.endFrame + 5,
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        color: colors.ink,
        padding: "88px 54px 72px",
      }}
    >
      <div style={{ opacity, fontFamily: "Inter, Arial, sans-serif" }}>
        <div
          style={{
            color: colors.accent,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 3,
            marginBottom: 18,
          }}
        >
          MOTIONLY AI · {String(index + 1).padStart(2, "0")}
        </div>
        <h1
          style={{
            fontSize: 52,
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: -2,
          }}
        >
          {index === 0
            ? (scene.title ?? "How does a solar eclipse happen?")
            : (scene.title ??
              (index === 1
                ? "The Moon moves into line"
                : index === 2
                  ? "A shadow reaches Earth"
                  : index === 3
                    ? "Totality reveals the corona"
                    : "One precise alignment"))}
        </h1>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {scene.template === "ECLIPSE_VIEW" ? (
          <EclipseView />
        ) : [
            "SORTED_ARRAY",
            "MIDPOINT",
            "DISCARD_HALF",
            "FOUND_TARGET",
            "COMPLEXITY",
          ].includes(scene.template) ? (
          <BinarySearchVisual mode={scene.template as BinarySearchMode} />
        ) : ["NUMBER_FLOW", "FORMULA", "GROWTH_CHART", "COMPARISON"].includes(
            scene.template,
          ) ? (
          <FinanceVisual mode={scene.template as FinanceMode} />
        ) : (
          <CelestialDiagram mode={mode} />
        )}
      </div>
      <div
        style={{
          background: "rgba(16,36,68,0.92)",
          border: `2px solid ${colors.panel}`,
          borderRadius: 28,
          padding: "28px 32px",
          boxSizing: "border-box",
          height: 132,
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 31,
          lineHeight: 1.32,
          fontWeight: 650,
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%", position: "relative" }}>
          {captions ? (
            sceneCaptions?.map((caption) => {
              const fadeFrames = Math.min(
                5,
                Math.max(
                  1,
                  Math.floor((caption.endFrame - caption.startFrame) / 3),
                ),
              );
              const captionOpacity = interpolate(
                globalFrame,
                [
                  caption.startFrame - fadeFrames,
                  caption.startFrame,
                  caption.endFrame - fadeFrames,
                  caption.endFrame,
                ],
                [0, 1, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              const translateY = interpolate(
                globalFrame,
                [caption.startFrame - fadeFrames, caption.startFrame],
                [8, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );

              return (
                <div
                  key={`${caption.startFrame}-${caption.text}`}
                  style={{
                    alignItems: "center",
                    display: "flex",
                    inset: 0,
                    opacity: captionOpacity,
                    position: "absolute",
                    transform: `translateY(${translateY}px)`,
                  }}
                >
                  {caption.text}
                </div>
              );
            })
          ) : (
            <div
              style={{ alignItems: "center", display: "flex", height: "100%" }}
            >
              {scene.narration}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MotionlyExplainer = ({
  storyboard,
  audioFile,
  audioPlaybackRate = 1,
  captions,
}: MotionlyExplainerProps) => {
  const timeline = compileTimeline(storyboard);
  return (
    <AbsoluteFill>
      {audioFile ? (
        <Audio src={staticFile(audioFile)} playbackRate={audioPlaybackRate} />
      ) : null}
      {timeline.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={scene.fromFrame}
          durationInFrames={scene.durationInFrames}
          premountFor={30}
        >
          <Scene
            storyboard={storyboard}
            index={index}
            sceneFromFrame={scene.fromFrame}
            captions={captions}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
