import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";

export type FinanceMode =
  "NUMBER_FLOW" | "FORMULA" | "GROWTH_CHART" | "COMPARISON";

const MoneyCard = ({
  x,
  value,
  label,
  scale,
}: {
  x: number;
  value: string;
  label: string;
  scale: number;
}) => (
  <g transform={`translate(${x} 285) scale(${scale})`}>
    <rect
      x="-112"
      y="-70"
      width="224"
      height="140"
      rx="28"
      fill={colors.panel}
    />
    <text
      y="-6"
      textAnchor="middle"
      fill={colors.ink}
      fontFamily="Inter, Arial, sans-serif"
      fontSize="38"
      fontWeight="800"
    >
      {value}
    </text>
    <text
      y="38"
      textAnchor="middle"
      fill={colors.muted}
      fontFamily="Inter, Arial, sans-serif"
      fontSize="20"
      fontWeight="600"
    >
      {label}
    </text>
  </g>
);

export const FinanceVisual = ({ mode }: { mode: FinanceMode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (delay = 0) =>
    spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.8 } });
  const progress = interpolate(frame, [0, fps * 3.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (mode === "NUMBER_FLOW") {
    return (
      <svg
        viewBox="0 0 720 650"
        width="100%"
        aria-label="Money growth example"
        style={{ fontFamily: "Inter, Arial, sans-serif" }}
      >
        <MoneyCard
          x={180}
          value="$1,000"
          label="Starting amount"
          scale={enter()}
        />
        <path
          d="M305 285 H415"
          stroke={colors.accent}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="110"
          strokeDashoffset={110 * (1 - progress)}
        />
        <path
          d="M405 265 L435 285 L405 305"
          fill="none"
          stroke={colors.accent}
          strokeWidth="7"
        />
        <MoneyCard x={550} value="$1,100" label="After 10%" scale={enter(10)} />
        <text
          x="360"
          y="470"
          textAnchor="middle"
          fill={colors.accent}
          fontSize="30"
          fontWeight="800"
        >
          + $100 interest
        </text>
      </svg>
    );
  }

  if (mode === "FORMULA") {
    return (
      <svg
        viewBox="0 0 720 650"
        width="100%"
        aria-label="Compound interest formula"
        style={{ fontFamily: "Inter, Arial, sans-serif" }}
      >
        <g
          opacity={enter()}
          transform={`translate(360 245) scale(${0.85 + enter() * 0.15})`}
        >
          <rect
            x="-280"
            y="-95"
            width="560"
            height="190"
            rx="36"
            fill={colors.panel}
          />
          <text
            textAnchor="middle"
            y="-16"
            fill={colors.ink}
            fontSize="42"
            fontWeight="800"
          >
            Balance × (1 + rate)
          </text>
          <text
            textAnchor="middle"
            y="48"
            fill={colors.accent}
            fontSize="30"
            fontWeight="700"
          >
            repeated every period
          </text>
        </g>
        <text
          x="360"
          y="455"
          textAnchor="middle"
          fill={colors.muted}
          fontSize="27"
          fontWeight="700"
        >
          Your interest starts earning interest
        </text>
      </svg>
    );
  }

  if (mode === "GROWTH_CHART") {
    const bars = [100, 210, 331];
    return (
      <svg
        viewBox="0 0 720 650"
        width="100%"
        aria-label="Three-year compound growth chart"
        style={{ fontFamily: "Inter, Arial, sans-serif" }}
      >
        <line
          x1="105"
          y1="500"
          x2="635"
          y2="500"
          stroke={colors.muted}
          strokeWidth="3"
        />
        {bars.map((height, index) => {
          const animatedHeight = height * enter(index * 7);
          return (
            <g key={height}>
              <rect
                x={145 + index * 175}
                y={500 - animatedHeight}
                width="105"
                height={animatedHeight}
                rx="18"
                fill={index === 2 ? colors.accent : colors.earth}
              />
              <text
                x={198 + index * 175}
                y={545}
                textAnchor="middle"
                fill={colors.ink}
                fontSize="23"
                fontWeight="700"
              >
                Year {index + 1}
              </text>
              <text
                x={198 + index * 175}
                y={475 - animatedHeight}
                textAnchor="middle"
                fill={colors.ink}
                fontSize="25"
                fontWeight="800"
              >
                {["$1,100", "$1,210", "$1,331"][index]}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  const compoundY = 470 - 250 * progress;
  const simpleY = 470 - 145 * progress;
  return (
    <svg
      viewBox="0 0 720 650"
      width="100%"
      aria-label="Simple versus compound growth"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      <line
        x1="90"
        y1="500"
        x2="635"
        y2="500"
        stroke={colors.muted}
        strokeWidth="3"
      />
      <line
        x1="90"
        y1="130"
        x2="90"
        y2="500"
        stroke={colors.muted}
        strokeWidth="3"
      />
      <path
        d={`M90 470 Q360 ${simpleY + 25} 620 ${simpleY}`}
        fill="none"
        stroke={colors.moon}
        strokeWidth="7"
      />
      <path
        d={`M90 470 Q350 450 620 ${compoundY}`}
        fill="none"
        stroke={colors.accent}
        strokeWidth="9"
      />
      <circle cx="620" cy={compoundY} r="11" fill={colors.accent} />
      <text
        x="450"
        y={compoundY - 24}
        fill={colors.accent}
        fontSize="24"
        fontWeight="800"
      >
        Compound
      </text>
      <text
        x="450"
        y={simpleY + 42}
        fill={colors.moon}
        fontSize="24"
        fontWeight="800"
      >
        Simple
      </text>
      <text
        x="360"
        y="570"
        textAnchor="middle"
        fill={colors.muted}
        fontSize="23"
      >
        Time invested
      </text>
    </svg>
  );
};
