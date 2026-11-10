import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";

interface CelestialDiagramProps {
  mode: "INTRO" | "ALIGN" | "SHADOW" | "RECAP";
}

const Label = ({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: string;
}) => (
  <text
    x={x}
    y={y}
    fill={colors.ink}
    textAnchor="middle"
    fontFamily="Inter, Arial, sans-serif"
    fontWeight={700}
    fontSize={26}
  >
    {children}
  </text>
);

export const CelestialDiagram = ({ mode }: CelestialDiagramProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = (delay: number) =>
    spring({ fps, frame: frame - delay, config: { damping: 18 } });
  const motion = interpolate(frame, [0, fps * 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const moonX = mode === "INTRO" ? 360 : 360 + (1 - motion) * 150;
  const shadowProgress = mode === "SHADOW" || mode === "RECAP" ? motion : 0;

  return (
    <svg
      viewBox="0 0 720 650"
      width="100%"
      aria-label="Solar eclipse diagram, not to scale"
    >
      <defs>
        <radialGradient id="sunGradient">
          <stop offset="0" stopColor="#FFF7B2" />
          <stop offset="0.65" stopColor={colors.sun} />
          <stop offset="1" stopColor={colors.sunGlow} />
        </radialGradient>
        <radialGradient id="earthGradient" cx="35%" cy="30%">
          <stop offset="0" stopColor="#76C7FF" />
          <stop offset="1" stopColor="#174CB5" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="16" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {(mode === "ALIGN" || mode === "SHADOW") && (
        <g opacity={0.5}>
          {[270, 315, 360, 405, 450].map((y) => (
            <line
              key={y}
              x1="150"
              y1={y}
              x2="590"
              y2={y}
              stroke={colors.sun}
              strokeWidth="4"
            />
          ))}
        </g>
      )}

      {shadowProgress > 0 && (
        <path
          d={`M ${moonX + 25} 325 L ${moonX + 25 + 185 * shadowProgress} 268 L ${moonX + 25 + 185 * shadowProgress} 382 Z`}
          fill={colors.shadow}
          opacity={0.9}
        />
      )}

      <g
        transform={`translate(115 325) scale(${0.6 + reveal(0) * 0.4})`}
        opacity={reveal(0)}
      >
        <circle r="78" fill={colors.sun} opacity="0.22" filter="url(#glow)" />
        <circle r="57" fill="url(#sunGradient)" />
      </g>
      <g
        transform={`translate(${moonX} 325) scale(${0.6 + reveal(10) * 0.4})`}
        opacity={reveal(10)}
      >
        <circle r="30" fill={colors.moon} stroke="#64748B" strokeWidth="4" />
        <circle cx="-8" cy="-8" r="6" fill="#94A3B8" opacity="0.7" />
      </g>
      <g
        transform={`translate(610 325) scale(${0.6 + reveal(20) * 0.4})`}
        opacity={reveal(20)}
      >
        <circle r="66" fill="url(#earthGradient)" />
        <path
          d="M-45-10 Q-15-45 5-22 T38-14 Q24 5 8 8 T-18 30 Q-48 22-45-10"
          fill={colors.land}
          opacity="0.9"
        />
        {mode === "RECAP" && (
          <circle cx="-62" cy="0" r="8" fill={colors.accent} />
        )}
      </g>

      <Label x={115} y={430}>
        Sun
      </Label>
      <Label x={moonX} y={400}>
        Moon
      </Label>
      <Label x={610} y={430}>
        Earth
      </Label>
      {(mode === "SHADOW" || mode === "RECAP") && (
        <text
          x="490"
          y="245"
          fill={colors.accent}
          fontSize="24"
          fontWeight="700"
        >
          Moon's shadow
        </text>
      )}
      <text
        x="360"
        y="595"
        textAnchor="middle"
        fill={colors.muted}
        fontSize="20"
        fontFamily="Inter, Arial, sans-serif"
      >
        Diagram not to scale
      </text>
    </svg>
  );
};
