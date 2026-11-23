import type { CSSProperties } from "react";

function hashTitle(value: string) {
  return [...value].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

function thumbnailKind(value: string) {
  const normalized = value.toLocaleLowerCase("en");
  if (/rainbow|colour|color|light|weather/u.test(normalized)) return "rainbow";
  if (/money|interest|finance|invest|saving|growth/u.test(normalized))
    return "finance";
  if (/search|algorithm|binary|code|data/u.test(normalized)) return "search";
  if (/habit|routine|focus|learn|memory/u.test(normalized)) return "habit";
  return "idea";
}

export function ProjectThumbnail({
  title,
  duration,
}: {
  title: string;
  duration: number;
}) {
  const hash = hashTitle(title);
  const hue = hash % 360;
  const accentHue = (hue + 74 + (hash % 48)) % 360;
  const initials = title
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const style = {
    "--thumb-hue": hue,
    "--thumb-accent-hue": accentHue,
  } as CSSProperties;

  return (
    <div
      className="project-thumbnail"
      data-kind={thumbnailKind(title)}
      style={style}
      aria-label={`Thumbnail for ${title}`}
    >
      <span>{initials || "MV"}</span>
      <div className="project-thumbnail-art" aria-hidden="true">
        <i />
        <i />
        <i />
        <b />
      </div>
      <small>{duration}s · 9:16</small>
    </div>
  );
}
