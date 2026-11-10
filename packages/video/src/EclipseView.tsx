import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";

export const EclipseView = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arrive = spring({ frame, fps, config: { damping: 16, mass: 0.8 } });
  const pulse = interpolate(Math.sin(frame / 10), [-1, 1], [0.78, 1]);
  const scale = interpolate(arrive, [0, 1], [0.65, 1]);

  return (
    <svg
      viewBox="0 0 720 650"
      width="100%"
      aria-label="View of total solar eclipse"
    >
      <defs>
        <radialGradient id="corona">
          <stop offset="0.42" stopColor="#FFFFFF" />
          <stop offset="0.52" stopColor="#FFF3B0" stopOpacity="0.95" />
          <stop offset="0.72" stopColor="#FFB21C" stopOpacity="0.3" />
          <stop offset="1" stopColor="#FFB21C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`translate(360 310) scale(${scale})`}>
        <circle r={220 * pulse} fill="url(#corona)" />
        <circle r="118" fill={colors.shadow} stroke="#F8FAFC" strokeWidth="5" />
        <circle cx="87" cy="-78" r="8" fill="#FFFFFF" />
      </g>
      <text
        x="360"
        y="585"
        textAnchor="middle"
        fill={colors.ink}
        fontSize="32"
        fontWeight="800"
        fontFamily="Inter, Arial, sans-serif"
      >
        TOTAL SOLAR ECLIPSE
      </text>
    </svg>
  );
};
