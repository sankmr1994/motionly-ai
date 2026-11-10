import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";

export type BinarySearchMode =
  "SORTED_ARRAY" | "MIDPOINT" | "DISCARD_HALF" | "FOUND_TARGET" | "COMPLEXITY";

const values = [3, 8, 12, 17, 23, 31, 42];
const boxSize = 72;
const gap = 10;
const arrayStartX = 73;

const ArrayBox = ({
  value,
  index,
  opacity = 1,
  active = false,
  found = false,
  scale = 1,
}: {
  value: number;
  index: number;
  opacity?: number;
  active?: boolean;
  found?: boolean;
  scale?: number;
}) => {
  const x = arrayStartX + index * (boxSize + gap);
  return (
    <g
      transform={`translate(${x + boxSize / 2} 330) scale(${scale})`}
      opacity={opacity}
    >
      <rect
        x={-boxSize / 2}
        y={-boxSize / 2}
        width={boxSize}
        height={boxSize}
        rx="18"
        fill={found ? colors.land : active ? colors.accent : colors.panel}
        stroke={active || found ? colors.ink : "#27446E"}
        strokeWidth={active || found ? 4 : 2}
      />
      <text
        y="11"
        textAnchor="middle"
        fill={active && !found ? colors.background : colors.ink}
        fontSize="29"
        fontWeight="800"
      >
        {value}
      </text>
      <text y="72" textAnchor="middle" fill={colors.muted} fontSize="17">
        {index}
      </text>
    </g>
  );
};

export const BinarySearchVisual = ({ mode }: { mode: BinarySearchMode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = (delay = 0) =>
    spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.75 } });
  const progress = interpolate(frame, [0, fps * 3.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fontStyle = { fontFamily: "Inter, Arial, sans-serif" };

  if (mode === "COMPLEXITY") {
    const rowCounts = [16, 8, 4, 2, 1];
    return (
      <svg
        viewBox="0 0 720 650"
        width="100%"
        aria-label="Search space halving each step"
        style={fontStyle}
      >
        {rowCounts.map((count, row) => {
          const visible = appear(row * 7);
          const cellWidth = Math.min(25, 440 / count);
          const totalWidth = count * (cellWidth + 4);
          return (
            <g
              key={count}
              opacity={visible}
              transform={`translate(${360 - totalWidth / 2} ${135 + row * 78})`}
            >
              {Array.from({ length: count }, (_, index) => (
                <rect
                  key={index}
                  x={index * (cellWidth + 4)}
                  width={cellWidth}
                  height="34"
                  rx="7"
                  fill={
                    row === rowCounts.length - 1 ? colors.land : colors.earth
                  }
                />
              ))}
              <text
                x={totalWidth + 20}
                y="25"
                fill={colors.muted}
                fontSize="20"
                fontWeight="700"
              >
                {count}
              </text>
            </g>
          );
        })}
        <text
          x="360"
          y="560"
          textAnchor="middle"
          fill={colors.accent}
          fontSize="38"
          fontWeight="900"
        >
          O(log n)
        </text>
      </svg>
    );
  }

  const discardedOpacity = mode === "DISCARD_HALF" ? 1 - progress : 1;
  const foundPhase = mode === "FOUND_TARGET" ? progress : 0;
  const activeIndex =
    mode === "MIDPOINT" || mode === "DISCARD_HALF"
      ? 3
      : mode === "FOUND_TARGET"
        ? foundPhase < 0.58
          ? 5
          : 4
        : -1;

  return (
    <svg
      viewBox="0 0 720 650"
      width="100%"
      aria-label="Animated binary search array"
      style={fontStyle}
    >
      <g opacity={appear()}>
        <rect
          x="245"
          y="95"
          width="230"
          height="72"
          rx="24"
          fill="#122F57"
          stroke={colors.accent}
          strokeWidth="3"
        />
        <text
          x="360"
          y="140"
          textAnchor="middle"
          fill={colors.ink}
          fontSize="27"
          fontWeight="800"
        >
          Target: 23
        </text>
      </g>

      {values.map((value, index) => {
        const reveal = mode === "SORTED_ARRAY" ? appear(index * 5) : appear();
        const isDiscarded = mode === "DISCARD_HALF" && index <= 3;
        const isFound =
          mode === "FOUND_TARGET" && index === 4 && foundPhase >= 0.58;
        return (
          <ArrayBox
            key={value}
            value={value}
            index={index}
            opacity={reveal * (isDiscarded ? discardedOpacity : 1)}
            active={index === activeIndex}
            found={isFound}
            scale={
              index === activeIndex ? 1 + Math.sin(frame / 5) * 0.035 : reveal
            }
          />
        );
      })}

      {mode === "MIDPOINT" && (
        <g opacity={appear(8)}>
          <path
            d="M355 230 L355 275"
            stroke={colors.accent}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M342 260 L355 278 L368 260"
            fill="none"
            stroke={colors.accent}
            strokeWidth="6"
          />
          <text
            x="360"
            y="465"
            textAnchor="middle"
            fill={colors.accent}
            fontSize="34"
            fontWeight="900"
          >
            23 &gt; 17 → search right
          </text>
        </g>
      )}

      {mode === "DISCARD_HALF" && (
        <g opacity={progress}>
          <path
            d="M75 330 H390"
            stroke="#FF6B7A"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <text
            x="230"
            y="455"
            textAnchor="middle"
            fill="#FF8A96"
            fontSize="27"
            fontWeight="800"
          >
            Discarded
          </text>
          <path
            d="M420 420 H625"
            stroke={colors.accent}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <text
            x="522"
            y="465"
            textAnchor="middle"
            fill={colors.accent}
            fontSize="27"
            fontWeight="800"
          >
            Keep searching
          </text>
        </g>
      )}

      {mode === "FOUND_TARGET" && (
        <g>
          <text
            x="360"
            y="455"
            textAnchor="middle"
            fill={foundPhase >= 0.58 ? colors.land : colors.accent}
            fontSize="34"
            fontWeight="900"
          >
            {foundPhase >= 0.58 ? "Found at index 4!" : "23 < 31 → move left"}
          </text>
          {foundPhase >= 0.58 && (
            <circle
              cx={arrayStartX + 4 * (boxSize + gap) + boxSize / 2}
              cy="330"
              r={52 + Math.sin(frame / 4) * 5}
              fill="none"
              stroke={colors.land}
              strokeWidth="6"
              opacity={appear(Math.round(fps * 2))}
            />
          )}
        </g>
      )}

      {mode === "SORTED_ARRAY" && (
        <text
          x="360"
          y="465"
          textAnchor="middle"
          fill={colors.muted}
          fontSize="25"
          fontWeight="700"
        >
          Values must be sorted first
        </text>
      )}
    </svg>
  );
};
