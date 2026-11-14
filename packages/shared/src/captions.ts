import { z } from "zod";

export const captionStyleSchema = z.enum(["MINIMAL", "KARAOKE", "BOLD"]);
export const captionReviewStatusSchema = z.enum(["DRAFT", "APPROVED"]);

export const captionCueSchema = z.object({
  id: z.string().min(1).max(120),
  startSeconds: z.number().finite().min(0),
  endSeconds: z.number().finite().positive(),
  text: z.string().trim().min(1).max(80),
});

export const captionSceneSchema = z.object({
  sceneId: z.string().min(1).max(120),
  cues: z.array(captionCueSchema).min(1).max(60),
});

export const captionReviewSchema = z.object({
  status: captionReviewStatusSchema,
  style: captionStyleSchema,
  version: z.number().int().positive(),
  scenes: z.array(captionSceneSchema).min(1).max(30),
});

export const captionEditsSchema = z.object({
  jobId: z.string().min(1).max(120),
  version: z.coerce.number().int().positive(),
  style: captionStyleSchema,
  cues: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        text: z.string().trim().min(1).max(80),
      }),
    )
    .min(1)
    .max(1_000),
});

export type CaptionStyle = z.infer<typeof captionStyleSchema>;
export type CaptionReviewStatus = z.infer<typeof captionReviewStatusSchema>;
export type CaptionCue = z.infer<typeof captionCueSchema>;
export type CaptionScene = z.infer<typeof captionSceneSchema>;
export type CaptionReview = z.infer<typeof captionReviewSchema>;
export type CaptionEdits = z.infer<typeof captionEditsSchema>;

type CharacterAlignment = {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
};

type TimedWord = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

function alignmentWords(alignment: CharacterAlignment): TimedWord[] {
  const { characters, characterStartTimesSeconds, characterEndTimesSeconds } =
    alignment;
  if (
    !characters.length ||
    characters.length !== characterStartTimesSeconds.length ||
    characters.length !== characterEndTimesSeconds.length
  ) {
    return [];
  }

  const words: TimedWord[] = [];
  let text = "";
  let firstIndex = -1;
  let lastIndex = -1;
  const flush = () => {
    const cleaned = text.trim();
    if (cleaned && firstIndex >= 0 && lastIndex >= firstIndex) {
      words.push({
        text: cleaned,
        startSeconds: characterStartTimesSeconds[firstIndex] ?? 0,
        endSeconds:
          characterEndTimesSeconds[lastIndex] ??
          characterStartTimesSeconds[firstIndex] ??
          0,
      });
    }
    text = "";
    firstIndex = -1;
    lastIndex = -1;
  };

  characters.forEach((character, index) => {
    if (/\s/u.test(character)) {
      flush();
      return;
    }
    if (firstIndex < 0) firstIndex = index;
    lastIndex = index;
    text += character;
  });
  flush();
  return words;
}

export function buildCaptionCues(
  sceneId: string,
  alignment: CharacterAlignment,
): CaptionCue[] {
  const words = alignmentWords(alignment);
  if (!words.length) return [];
  const cues: CaptionCue[] = [];
  let phrase: TimedWord[] = [];

  const flush = () => {
    if (!phrase.length) return;
    const first = phrase[0];
    const last = phrase.at(-1);
    if (!first || !last) return;
    cues.push({
      id: `${sceneId}_caption_${String(cues.length + 1).padStart(2, "0")}`,
      startSeconds: first.startSeconds,
      endSeconds: Math.max(last.endSeconds, first.startSeconds + 0.1),
      text: phrase.map((word) => word.text).join(" "),
    });
    phrase = [];
  };

  words.forEach((word) => {
    const proposedText = [...phrase, word].map((item) => item.text).join(" ");
    const proposedDuration = phrase.length
      ? word.endSeconds - (phrase[0]?.startSeconds ?? word.startSeconds)
      : 0;
    if (
      phrase.length > 0 &&
      (phrase.length >= 6 || proposedText.length > 42 || proposedDuration > 3.2)
    ) {
      flush();
    }
    phrase.push(word);
    if (phrase.length >= 3 && /[.!?]$/u.test(word.text)) flush();
  });
  flush();
  return captionReviewSchema.shape.scenes.element.shape.cues.parse(cues);
}

export function findActiveCaptionCue(
  cues: CaptionCue[],
  currentTimeSeconds: number,
) {
  return cues.find(
    (cue) =>
      currentTimeSeconds >= cue.startSeconds &&
      currentTimeSeconds < cue.endSeconds,
  );
}
