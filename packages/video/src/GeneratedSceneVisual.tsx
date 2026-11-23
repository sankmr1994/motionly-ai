import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

function directionFromSceneId(sceneId: string) {
  const sum = [...sceneId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return sum % 2 === 0 ? 1 : -1;
}

export function GeneratedSceneVisual({
  fileName,
  sceneId,
}: {
  fileName: string;
  sceneId: string;
}) {
  const frame = useCurrentFrame();
  const direction = directionFromSceneId(sceneId);
  const scale = interpolate(frame, [0, 240], [1.03, 1.12], {
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(
    frame,
    [0, 240],
    [-10 * direction, 10 * direction],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        border: "2px solid rgba(78, 211, 255, 0.28)",
        borderRadius: 32,
        boxShadow: "0 28px 70px rgba(0, 0, 0, 0.38)",
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile(fileName)}
        style={{
          height: "100%",
          objectFit: "cover",
          transform: `translateX(${translateX}px) scale(${scale})`,
          width: "100%",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,16,36,0.12) 0%, rgba(5,16,36,0) 48%, rgba(5,16,36,0.24) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}
