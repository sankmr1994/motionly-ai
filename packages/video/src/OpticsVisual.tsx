import type { StoryboardScene } from "@motionly/shared";
import { interpolate, useCurrentFrame } from "remotion";

const spectrum = [
  "#ff4d6d",
  "#ff9f1c",
  "#ffe66d",
  "#4ade80",
  "#38bdf8",
  "#6366f1",
  "#a855f7",
];

export function OpticsVisual({ scene }: { scene: StoryboardScene }) {
  const frame = useCurrentFrame();
  const beamProgress = interpolate(frame, [4, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spectrumProgress = interpolate(frame, [28, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dropletPulse = 1 + Math.sin(frame / 10) * 0.035;

  return (
    <svg
      viewBox="0 0 612 540"
      width="100%"
      height="100%"
      aria-label={scene.title ?? "Light refraction through a water droplet"}
    >
      <defs>
        <radialGradient id={`sun-${scene.id}`}>
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset="0.42" stopColor="#ffd84d" />
          <stop offset="1" stopColor="#ff9f1c" />
        </radialGradient>
        <linearGradient id={`drop-${scene.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#dff8ff" stopOpacity="0.95" />
          <stop offset="0.46" stopColor="#38bdf8" stopOpacity="0.72" />
          <stop offset="1" stopColor="#2563eb" stopOpacity="0.5" />
        </linearGradient>
        <filter id={`glow-${scene.id}`}>
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="88"
        cy="257"
        r="47"
        fill={`url(#sun-${scene.id})`}
        filter={`url(#glow-${scene.id})`}
      />
      {Array.from({ length: 10 }, (_, index) => {
        const angle = (index / 10) * Math.PI * 2;
        return (
          <line
            key={index}
            x1={88 + Math.cos(angle) * 60}
            y1={257 + Math.sin(angle) * 60}
            x2={88 + Math.cos(angle) * 77}
            y2={257 + Math.sin(angle) * 77}
            stroke="#ffd84d"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.72"
          />
        );
      })}

      <line
        x1="145"
        y1="257"
        x2="306"
        y2="257"
        pathLength="1"
        stroke="#fffce8"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray="1"
        strokeDashoffset={1 - beamProgress}
        filter={`url(#glow-${scene.id})`}
      />

      <g transform={`translate(332 260) scale(${dropletPulse})`}>
        <path
          d="M0 -96 C-15 -61 -66 -11 -66 40 C-66 85 -37 116 0 116 C37 116 66 85 66 40 C66 -11 15 -61 0 -96Z"
          fill={`url(#drop-${scene.id})`}
          stroke="#b9f1ff"
          strokeWidth="4"
        />
        <path
          d="M-35 -4 C-7 -29 14 -29 39 -7"
          fill="none"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>

      {spectrum.map((color, index) => {
        const y = 190 + index * 23;
        return (
          <line
            key={color}
            x1="374"
            y1="258"
            x2="566"
            y2={y}
            pathLength="1"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="1"
            strokeDashoffset={1 - spectrumProgress}
            filter={`url(#glow-${scene.id})`}
          />
        );
      })}

      <text x="62" y="352" fill="#f8fafc" fontSize="18" fontWeight="800">
        sunlight
      </text>
      <text x="278" y="414" fill="#7dd3fc" fontSize="18" fontWeight="800">
        water droplet
      </text>
      <text x="442" y="414" fill="#c4b5fd" fontSize="18" fontWeight="800">
        colour spectrum
      </text>
    </svg>
  );
}
