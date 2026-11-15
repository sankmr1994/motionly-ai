import type { StoryboardScene } from "@motionly/shared";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./theme";

const font = "Inter, Arial, sans-serif";
const symbols = ["●", "↗", "✦", "◆", "+", "✓"];

function enter(frame: number, fps: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 115, mass: 0.75 },
  });
}

function TitleVisual({ scene }: { scene: StoryboardScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 3);
  const pulse = 1 + Math.sin(frame / 10) * 0.025;
  const positions = [
    { left: 12, top: 8 },
    { right: 4, top: 42 },
    { left: 8, bottom: 2 },
  ];
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 520,
        fontFamily: font,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 330,
          height: 330,
          transform: `translate(-50%, -50%) scale(${pulse})`,
          border: `2px solid ${colors.accent}55`,
          borderRadius: "50%",
          boxShadow: `0 0 70px ${colors.earth}33, inset 0 0 50px ${colors.accent}18`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 224,
          height: 224,
          display: "grid",
          placeItems: "center",
          padding: 28,
          transform: `translate(-50%, -50%) scale(${enter(frame, fps)})`,
          borderRadius: "50%",
          background: `linear-gradient(145deg, ${colors.earth}, #1745c7)`,
          boxShadow: "0 26px 65px rgba(46,128,255,0.35)",
          color: "#fff",
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1.08,
          textAlign: "center",
        }}
      >
        {objects[1] ?? scene.title}
      </div>
      {objects.map((object, index) => {
        const reveal = enter(frame, fps, 8 + index * 8);
        const float = Math.sin((frame + index * 13) / 11) * 7;
        return (
          <div
            key={object}
            style={{
              position: "absolute",
              ...positions[index],
              maxWidth: 210,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "13px 16px",
              transform: `translateY(${float + (1 - reveal) * 24}px) scale(${0.9 + reveal * 0.1})`,
              opacity: reveal,
              border: "1px solid #31527e",
              borderRadius: 999,
              background: "rgba(16,36,68,0.94)",
              boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
              color: colors.ink,
              fontSize: 18,
              fontWeight: 750,
            }}
          >
            <span style={{ color: colors.accent }}>{symbols[index]}</span>
            {object}
          </div>
        );
      })}
    </div>
  );
}

function StatVisual({ scene }: { scene: StoryboardScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 3);
  const flow = interpolate(frame, [10, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "1fr 54px 1fr 54px 1fr",
        alignItems: "center",
        gap: 12,
        fontFamily: font,
      }}
    >
      {objects.map((object, index) => {
        const reveal = enter(frame, fps, index * 10);
        const isResult = index === objects.length - 1;
        return (
          <div key={object} style={{ display: "contents" }}>
            <div
              style={{
                minHeight: isResult ? 190 : 158,
                display: "grid",
                alignContent: "center",
                gap: 13,
                padding: "24px 18px",
                transform: `translateY(${(1 - reveal) * 30}px) scale(${0.94 + reveal * 0.06})`,
                opacity: reveal,
                border: `2px solid ${isResult ? colors.accent : "#29476e"}`,
                borderRadius: 25,
                background: isResult
                  ? `linear-gradient(150deg, ${colors.earth}, #153aab)`
                  : colors.panel,
                boxShadow: isResult
                  ? "0 24px 55px rgba(46,128,255,0.3)"
                  : "0 18px 40px rgba(0,0,0,0.18)",
                color: colors.ink,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: isResult ? colors.accent : colors.land,
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                {isResult ? "↗" : symbols[index]}
              </span>
              <strong style={{ fontSize: 20, lineHeight: 1.18 }}>
                {object}
              </strong>
            </div>
            {index < objects.length - 1 ? (
              <div
                style={{
                  position: "relative",
                  height: 4,
                  borderRadius: 99,
                  background: "#29476e",
                }}
              >
                <i
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${flow * 100}%`,
                    borderRadius: 99,
                    background: colors.accent,
                  }}
                />
                <b
                  style={{
                    position: "absolute",
                    right: -5,
                    top: -10,
                    color: colors.accent,
                    fontSize: 20,
                  }}
                >
                  ›
                </b>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ListVisual({ scene }: { scene: StoryboardScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 5);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "grid",
        gap: 14,
        fontFamily: font,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 34,
          top: 45,
          bottom: 45,
          width: 3,
          background: "linear-gradient(#67e8f9, #2e80ff, #42d392)",
        }}
      />
      {objects.map((object, index) => {
        const reveal = enter(frame, fps, index * 9);
        const accent = [colors.accent, colors.earth, colors.land][index % 3];
        return (
          <div
            key={object}
            style={{
              position: "relative",
              minHeight: 92,
              display: "grid",
              gridTemplateColumns: "68px 1fr auto",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px 14px 0",
              transform: `translateX(${(1 - reveal) * 48}px)`,
              opacity: reveal,
              border: "1px solid #29476e",
              borderRadius: 22,
              background: "linear-gradient(90deg, #102444, #0c1b33)",
              boxShadow: "0 14px 32px rgba(0,0,0,0.16)",
              color: colors.ink,
            }}
          >
            <span
              style={{
                zIndex: 1,
                width: 48,
                height: 48,
                display: "grid",
                placeItems: "center",
                justifySelf: "center",
                borderRadius: "50%",
                background: accent,
                color: colors.background,
                fontSize: 20,
                fontWeight: 950,
              }}
            >
              {symbols[index]}
            </span>
            <strong style={{ fontSize: 23, lineHeight: 1.2 }}>{object}</strong>
            <span style={{ color: accent, fontSize: 24 }}>→</span>
          </div>
        );
      })}
    </div>
  );
}

function ProcessVisual({ scene }: { scene: StoryboardScene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const objects = scene.objects.slice(0, 4);
  const travel = interpolate(frame % 70, [0, 70], [0, 100]);
  return (
    <div style={{ width: "100%", display: "grid", gap: 18, fontFamily: font }}>
      {objects.map((object, index) => {
        const reveal = enter(frame, fps, index * 10);
        return (
          <div key={object}>
            <div
              style={{
                minHeight: 104,
                display: "grid",
                gridTemplateColumns: "62px 1fr auto",
                alignItems: "center",
                gap: 16,
                padding: "14px 20px",
                transform: `scale(${0.93 + reveal * 0.07})`,
                opacity: reveal,
                border: `2px solid ${index === objects.length - 1 ? colors.land : "#31527e"}`,
                borderRadius: 24,
                background:
                  index === objects.length - 1
                    ? "linear-gradient(100deg, #123c3a, #102444)"
                    : colors.panel,
                color: colors.ink,
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 15,
                  background:
                    index === objects.length - 1 ? colors.land : colors.earth,
                  color: colors.background,
                  fontSize: 19,
                  fontWeight: 950,
                }}
              >
                {symbols[index]}
              </span>
              <strong style={{ fontSize: 24 }}>{object}</strong>
              <span
                style={{
                  color:
                    index === objects.length - 1 ? colors.land : colors.accent,
                  fontSize: 27,
                  fontWeight: 900,
                }}
              >
                {index === objects.length - 1 ? "✓" : "+"}
              </span>
            </div>
            {index < objects.length - 1 ? (
              <div
                style={{
                  position: "relative",
                  height: 14,
                  marginLeft: 49,
                  borderLeft: "3px solid #31527e",
                }}
              >
                <i
                  style={{
                    position: "absolute",
                    left: -6,
                    top: `${travel}%`,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: colors.accent,
                    boxShadow: `0 0 12px ${colors.accent}`,
                  }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function GenericVisual({ scene }: { scene: StoryboardScene }) {
  if (scene.template === "TITLE") return <TitleVisual scene={scene} />;
  if (scene.template === "STAT_CARD") return <StatVisual scene={scene} />;
  if (["PROCESS", "TIMELINE"].includes(scene.template)) {
    return <ProcessVisual scene={scene} />;
  }
  return <ListVisual scene={scene} />;
}
