import type { StoryboardScene } from "@motionly/shared";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";
import type { VisualDomain } from "./visual-domain";

const font = "Inter, Arial, sans-serif";

const domainAccent: Record<VisualDomain, string> = {
  AI: "#A78BFA",
  SPACE: "#67E8F9",
  FINANCE: "#42D392",
  ALGORITHM: "#60A5FA",
  NATURE: "#F9E44D",
  HABIT: "#FB7185",
  GENERAL: colors.accent,
};

const domainLabel: Record<VisualDomain, string> = {
  AI: "INTELLIGENT SYSTEM",
  SPACE: "SPACE SYSTEM",
  FINANCE: "VALUE FLOW",
  ALGORITHM: "LOGIC FLOW",
  NATURE: "NATURAL PROCESS",
  HABIT: "BEHAVIOUR LOOP",
  GENERAL: "KEY CONCEPT",
};

function reveal(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 17, stiffness: 105, mass: 0.72 },
  });
}

function shortLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\s+/gu, " ").trim().slice(0, 34);
}

function HeroVisual({
  scene,
  domain,
}: {
  scene: StoryboardScene;
  domain: VisualDomain;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 5);
  const accent = domainAccent[domain];
  const pulse = 1 + Math.sin(frame / 11) * 0.025;
  const positions: Array<{
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  }> = [
    { left: 18, top: 60 },
    { right: 12, top: 10 },
    { right: 22, bottom: 35 },
    { left: 34, bottom: 2 },
  ];
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 540,
        fontFamily: font,
      }}
    >
      <svg
        viewBox="0 0 612 540"
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
      >
        <g opacity="0.28" stroke={accent} strokeWidth="3">
          {positions.map((position, index) => {
            const x =
              position.left !== undefined
                ? position.left + 75
                : 535 - (position.right ?? 0);
            const y =
              position.top !== undefined
                ? position.top + 45
                : 485 - (position.bottom ?? 0);
            return <line key={index} x1="306" y1="270" x2={x} y2={y} />;
          })}
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 245,
          height: 190,
          display: "grid",
          alignContent: "center",
          gap: 12,
          padding: 28,
          transform: `translate(-50%, -50%) scale(${pulse * reveal(frame, fps)})`,
          border: `2px solid ${accent}`,
          borderRadius: domain === "AI" || domain === "ALGORITHM" ? 34 : 95,
          background: `linear-gradient(145deg, ${accent}33, ${colors.panel})`,
          boxShadow: `0 24px 65px ${accent}24`,
          textAlign: "center",
        }}
      >
        <small
          style={{
            color: accent,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          {domainLabel[domain]}
        </small>
        <strong style={{ color: "#fff", fontSize: 29, lineHeight: 1.1 }}>
          {shortLabel(scene.title ?? objects[0] ?? "Main idea")}
        </strong>
      </div>
      {objects.slice(0, 4).map((object, index) => (
        <div
          key={`${object}-${index}`}
          style={{
            position: "absolute",
            ...positions[index],
            maxWidth: 185,
            padding: "12px 15px",
            transform: `translateY(${(1 - reveal(frame, fps, 8 + index * 7)) * 20}px)`,
            opacity: reveal(frame, fps, 8 + index * 7),
            border: `1px solid ${accent}88`,
            borderRadius: 14,
            background: "rgba(12,27,51,0.96)",
            color: colors.ink,
            fontSize: 18,
            fontWeight: 750,
          }}
        >
          <span style={{ color: accent, marginRight: 8 }}>◆</span>
          {shortLabel(object)}
        </div>
      ))}
    </div>
  );
}

function DiagramVisual({
  scene,
  domain,
}: {
  scene: StoryboardScene;
  domain: VisualDomain;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 6);
  const accent = domainAccent[domain];
  const positions = [
    [306, 85],
    [115, 220],
    [497, 220],
    [170, 420],
    [442, 420],
    [306, 300],
  ] as const;
  const draw = interpolate(frame, [4, fps * 1.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg viewBox="0 0 612 540" width="100%" style={{ fontFamily: font }}>
      <defs>
        <filter id={`semantic-glow-${scene.id}`}>
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {positions.slice(1, objects.length).map(([x, y], index) => (
        <line
          key={`line-${index}`}
          x1={positions[0][0]}
          y1={positions[0][1]}
          x2={x}
          y2={y}
          pathLength="1"
          stroke={accent}
          strokeWidth="4"
          strokeDasharray="1"
          strokeDashoffset={1 - draw}
          opacity="0.48"
        />
      ))}
      {objects.map((object, index) => {
        const [x, y] = positions[index] ?? positions.at(-1)!;
        const entered = reveal(frame, fps, index * 7);
        return (
          <g
            key={`${object}-${index}`}
            transform={`translate(${x} ${y}) scale(${0.78 + entered * 0.22})`}
            opacity={entered}
          >
            <rect
              x="-91"
              y="-39"
              width="182"
              height="78"
              rx={domain === "AI" ? 13 : 28}
              fill={index === 0 ? `${accent}38` : colors.panel}
              stroke={index === 0 ? accent : "#31527e"}
              strokeWidth={index === 0 ? 3 : 2}
              filter={
                index === 0 ? `url(#semantic-glow-${scene.id})` : undefined
              }
            />
            <text
              y="6"
              textAnchor="middle"
              fill={colors.ink}
              fontSize="18"
              fontWeight="800"
            >
              {shortLabel(object)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartVisual({
  scene,
  domain,
}: {
  scene: StoryboardScene;
  domain: VisualDomain;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 5);
  const accent = domainAccent[domain];
  return (
    <svg viewBox="0 0 612 540" width="100%" style={{ fontFamily: font }}>
      <line
        x1="65"
        y1="450"
        x2="565"
        y2="450"
        stroke="#64748b"
        strokeWidth="3"
      />
      {objects.map((object, index) => {
        const maximum = 150 + ((index * 67 + object.length * 11) % 195);
        const height = maximum * reveal(frame, fps, index * 7);
        const width = Math.min(90, 400 / Math.max(1, objects.length));
        const gap = 440 / Math.max(1, objects.length);
        const x = 82 + index * gap;
        return (
          <g key={`${object}-${index}`}>
            <rect
              x={x}
              y={450 - height}
              width={width}
              height={height}
              rx="14"
              fill={index === objects.length - 1 ? accent : colors.earth}
            />
            <text
              x={x + width / 2}
              y="485"
              textAnchor="middle"
              fill={colors.ink}
              fontSize="15"
              fontWeight="750"
            >
              {shortLabel(object).slice(0, 16)}
            </text>
          </g>
        );
      })}
      <text
        x="65"
        y="70"
        fill={accent}
        fontSize="18"
        fontWeight="900"
        letterSpacing="2"
      >
        {domainLabel[domain]}
      </text>
    </svg>
  );
}

function FlowVisual({
  scene,
  domain,
}: {
  scene: StoryboardScene;
  domain: VisualDomain;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 4);
  const accent = domainAccent[domain];
  return (
    <div style={{ width: "100%", display: "grid", gap: 18, fontFamily: font }}>
      {objects.map((object, index) => {
        const entered = reveal(frame, fps, index * 9);
        return (
          <div key={`${object}-${index}`}>
            <div
              style={{
                minHeight: 96,
                display: "grid",
                gridTemplateColumns: "52px minmax(0, 1fr) 34px",
                alignItems: "center",
                gap: 16,
                padding: "12px 20px",
                transform: `translateX(${(1 - entered) * 42}px)`,
                opacity: entered,
                border: `2px solid ${index === objects.length - 1 ? accent : "#31527e"}`,
                borderRadius: 20,
                background:
                  index === objects.length - 1 ? `${accent}20` : colors.panel,
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: domain === "AI" ? 10 : 21,
                  background: accent,
                  color: colors.background,
                  fontSize: 16,
                  fontWeight: 950,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong style={{ color: colors.ink, fontSize: 22 }}>
                {shortLabel(object)}
              </strong>
              <span style={{ color: accent, fontSize: 25 }}>→</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComparisonVisual({
  scene,
  domain,
}: {
  scene: StoryboardScene;
  domain: VisualDomain;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = domainAccent[domain];
  const objects = scene.objects.slice(0, 4);
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(2, Math.max(1, objects.length))}, minmax(0, 1fr))`,
        gap: 18,
        fontFamily: font,
      }}
    >
      {objects.map((object, index) => {
        const entered = reveal(frame, fps, index * 8);
        return (
          <div
            key={`${object}-${index}`}
            style={{
              minHeight: 190,
              display: "grid",
              alignContent: "center",
              gap: 18,
              padding: 24,
              transform: `scale(${0.9 + entered * 0.1})`,
              opacity: entered,
              border: `2px solid ${index % 2 ? accent : "#31527e"}`,
              borderRadius: 24,
              background: index % 2 ? `${accent}20` : colors.panel,
              color: colors.ink,
              textAlign: "center",
            }}
          >
            <span
              style={{ color: index % 2 ? accent : colors.earth, fontSize: 34 }}
            >
              {index % 2 ? "↗" : "◆"}
            </span>
            <strong style={{ fontSize: 22, lineHeight: 1.2 }}>
              {shortLabel(object)}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export function SemanticVisual({
  scene,
  domain,
}: {
  scene: StoryboardScene;
  domain: VisualDomain;
}) {
  if (scene.template === "TITLE") {
    return <HeroVisual scene={scene} domain={domain} />;
  }
  if (scene.template === "GROWTH_CHART") {
    return <ChartVisual scene={scene} domain={domain} />;
  }
  if (["NUMBER_FLOW", "FORMULA"].includes(scene.template)) {
    return <FlowVisual scene={scene} domain={domain} />;
  }
  if (["COMPARISON", "BEFORE_AFTER"].includes(scene.template)) {
    return <ComparisonVisual scene={scene} domain={domain} />;
  }
  return <DiagramVisual scene={scene} domain={domain} />;
}
