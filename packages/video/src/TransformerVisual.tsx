import type { StoryboardScene } from "@motionly/shared";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type TransformerMode = "TOKENS" | "ATTENTION" | "PARALLEL" | "OUTPUT";

function resolveMode(scene: StoryboardScene): TransformerMode {
  const text = `${scene.title ?? ""} ${scene.narration} ${scene.objects.join(" ")}`;
  if (/token|word|input|embedding/iu.test(text)) return "TOKENS";
  if (/attention|context|relationship|weight/iu.test(text)) return "ATTENTION";
  if (/parallel|simultaneous|faster|processing/iu.test(text)) return "PARALLEL";
  return "OUTPUT";
}

export function TransformerVisual({ scene }: { scene: StoryboardScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mode = resolveMode(scene);
  const progress = interpolate(frame, [4, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 0.96 + Math.sin(frame / 9) * 0.04;
  const words = (
    scene.objects.length
      ? scene.objects
      : ["input", "attention", "context", "output"]
  ).slice(0, 5);

  if (mode === "ATTENTION") {
    const positions = [
      [92, 126],
      [306, 88],
      [520, 126],
      [150, 384],
      [462, 384],
    ] as const;
    return (
      <svg viewBox="0 0 612 520" width="100%" height="100%">
        {positions.flatMap(([x1, y1], from) =>
          positions
            .slice(from + 1)
            .map(([x2, y2], offset) => (
              <line
                key={`${from}-${offset}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                pathLength="1"
                stroke={offset % 2 ? "#22d3ee" : "#8b5cf6"}
                strokeWidth={2 + ((from + offset) % 3)}
                strokeDasharray="1"
                strokeDashoffset={1 - progress}
                opacity="0.55"
              />
            )),
        )}
        {positions.map(([x, y], index) => {
          const entered = spring({ frame: frame - index * 5, fps });
          return (
            <g key={index} transform={`translate(${x} ${y}) scale(${entered})`}>
              <circle r="54" fill="#102c56" stroke="#60a5fa" strokeWidth="3" />
              <circle r={18 * pulse} fill={index % 2 ? "#a78bfa" : "#22d3ee"} />
              <text
                y="82"
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="16"
                fontWeight="800"
              >
                {(words[index] ?? `token ${index + 1}`).slice(0, 16)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (mode === "PARALLEL") {
    return (
      <svg viewBox="0 0 612 520" width="100%" height="100%">
        {[0, 1, 2, 3].map((lane) => {
          const y = 92 + lane * 108;
          const offset = interpolate(frame - lane * 5, [0, 60], [0, 325], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <g key={lane}>
              <rect
                x="74"
                y={y}
                width="464"
                height="64"
                rx="32"
                fill="#0f274b"
                stroke="#31527e"
              />
              <circle
                cx={110 + offset}
                cy={y + 32}
                r="22"
                fill={lane % 2 ? "#a78bfa" : "#22d3ee"}
              />
              <text
                x="94"
                y={y + 39}
                fill="#fff"
                fontSize="17"
                fontWeight="800"
              >
                {String(lane + 1).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (mode === "TOKENS") {
    return (
      <div style={{ display: "grid", gap: 28, width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            justifyContent: "center",
          }}
        >
          {words.map((word, index) => {
            const entered = spring({ frame: frame - index * 6, fps });
            return (
              <div
                key={`${word}-${index}`}
                style={{
                  background: index % 2 ? "#213a67" : "#153f5f",
                  border: `2px solid ${index % 2 ? "#a78bfa" : "#22d3ee"}`,
                  borderRadius: 18,
                  color: "#f8fafc",
                  fontFamily: "Inter, Arial, sans-serif",
                  fontSize: 21,
                  fontWeight: 800,
                  opacity: entered,
                  padding: "20px 24px",
                  transform: `translateY(${(1 - entered) * 38}px)`,
                }}
              >
                {word.replaceAll("_", " ").slice(0, 20)}
              </div>
            );
          })}
        </div>
        <div
          style={{
            color: "#22d3ee",
            fontSize: 52,
            textAlign: "center",
            transform: `scale(${pulse})`,
          }}
        >
          ↓
        </div>
        <div
          style={{
            alignSelf: "center",
            background: "linear-gradient(135deg,#1d4ed8,#7c3aed)",
            borderRadius: 28,
            color: "white",
            fontSize: 25,
            fontWeight: 900,
            justifySelf: "center",
            padding: "30px 54px",
          }}
        >
          contextual representation
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 18,
        justifyContent: "center",
        width: "100%",
      }}
    >
      {["INPUT", "ATTENTION", "CONTEXT", "OUTPUT"].map((label, index) => {
        const entered = spring({ frame: frame - index * 8, fps });
        return (
          <div
            key={label}
            style={{ alignItems: "center", display: "flex", gap: 18 }}
          >
            <div
              style={{
                background:
                  index === 3
                    ? "linear-gradient(145deg,#2563eb,#8b5cf6)"
                    : "#102c56",
                border: "2px solid #31527e",
                borderRadius: 22,
                color: "#f8fafc",
                fontSize: 17,
                fontWeight: 900,
                opacity: entered,
                padding: "34px 18px",
                textAlign: "center",
                transform: `scale(${0.8 + entered * 0.2})`,
                width: 105,
              }}
            >
              {label}
            </div>
            {index < 3 ? (
              <span style={{ color: "#22d3ee", fontSize: 30 }}>→</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
