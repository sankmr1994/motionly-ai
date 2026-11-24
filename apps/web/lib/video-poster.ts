function escapeXml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character] ?? character;
  });
}

function wrapTitle(value: string, maximumCharacters = 24) {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || current.length + word.length + 1 > maximumCharacters) {
      if (lines.length === 3) break;
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }
  if (words.join(" ").length > lines.join(" ").length && lines.length) {
    lines[lines.length - 1] = `${lines.at(-1)!.replace(/[.\s]+$/u, "")}…`;
  }
  return lines.map(escapeXml);
}

function posterArtwork(title: string) {
  const normalized = title.toLocaleLowerCase("en");
  if (/rainbow|colour|color|light|weather/u.test(normalized)) {
    return `<g fill="none" stroke-linecap="round" stroke-width="22">
      <path d="M115 775 A245 245 0 0 1 605 775" stroke="#ff5577"/>
      <path d="M145 775 A215 215 0 0 1 575 775" stroke="#ffb52e"/>
      <path d="M175 775 A185 185 0 0 1 545 775" stroke="#ffe26b"/>
      <path d="M205 775 A155 155 0 0 1 515 775" stroke="#54dc9a"/>
      <path d="M235 775 A125 125 0 0 1 485 775" stroke="#58a6ff"/>
    </g>`;
  }
  if (/money|interest|finance|invest|saving|growth/u.test(normalized)) {
    return `<g><rect x="130" y="655" width="105" height="185" rx="24" fill="#3869ff"/><rect x="305" y="555" width="105" height="285" rx="24" fill="#59b7ff"/><rect x="480" y="430" width="105" height="410" rx="24" fill="#a9ed56"/><path d="M165 590 L355 480 L530 345" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  if (/search|algorithm|binary|code|data|transformer|ai\b/u.test(normalized)) {
    return `<g fill="none" stroke="#65d7ff" stroke-width="10"><circle cx="360" cy="610" r="120"/><circle cx="360" cy="610" r="190" opacity=".45"/><path d="M360 420V315M205 500l-90-52M515 500l90-52M360 800v105"/></g><circle cx="360" cy="610" r="82" fill="#3869ff"/><g fill="#b9f65a"><circle cx="360" cy="300" r="22"/><circle cx="98" cy="438" r="22"/><circle cx="622" cy="438" r="22"/><circle cx="360" cy="930" r="22"/></g>`;
  }
  return `<g><circle cx="360" cy="620" r="190" fill="#3869ff" opacity=".18"/><circle cx="360" cy="620" r="125" fill="#3869ff"/><path d="M325 555l105 65-105 65z" fill="#fff"/><circle cx="510" cy="455" r="38" fill="#b9f65a"/><circle cx="195" cy="775" r="28" fill="#65d7ff"/></g>`;
}

export function createVideoPosterDataUrl(
  title: string,
  durationSeconds: number,
) {
  const lines = wrapTitle(title || "Your Motionly video");
  const titleMarkup = lines
    .map(
      (line, index) => `<tspan x="72" dy="${index ? 58 : 0}">${line}</tspan>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07142c"/><stop offset="1" stop-color="#10254a"/></linearGradient></defs>
    <rect width="720" height="1280" fill="url(#bg)"/>
    <text x="72" y="90" fill="#65d7ff" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="5">MOTIONLY AI</text>
    <text x="72" y="170" fill="#fff" font-family="Arial,sans-serif" font-size="48" font-weight="700">${titleMarkup}</text>
    ${posterArtwork(title)}
    <rect x="72" y="1120" width="576" height="2" fill="#29466f"/>
    <text x="72" y="1175" fill="#b9f65a" font-family="Arial,sans-serif" font-size="22" font-weight="700">WATCH VIDEO</text>
    <text x="648" y="1175" fill="#9eb2cf" text-anchor="end" font-family="Arial,sans-serif" font-size="20">${Math.round(durationSeconds)}s · 9:16</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
