import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  compileTimeline,
  storyboardSchema,
  type Storyboard,
} from "@motionly/shared";
import { generateTimestampedSpeech } from "./elevenlabs";

type CaptionCue = {
  sceneId: string;
  startFrame: number;
  endFrame: number;
  text: string;
};

export const generateNarratedVideoAssets = async (
  storyboard: Storyboard,
  slug: string,
) => {
  const fps = storyboard.video.fps;
  const totalFrames = storyboard.video.targetDurationSeconds * fps;
  const sceneSeparator = " ";
  const narration = storyboard.scenes
    .map((scene) => scene.narration)
    .join(sceneSeparator);
  const speech = await generateTimestampedSpeech(narration, { speed: 1.08 });
  const alignment = speech.alignment ?? speech.normalizedAlignment;

  if (!alignment)
    throw new Error("ElevenLabs returned audio without timestamp alignment.");
  if (alignment.characters.length !== narration.length) {
    throw new Error(
      `Timestamp alignment length ${alignment.characters.length} does not match narration length ${narration.length}.`,
    );
  }

  const finalTimestamp = alignment.character_end_times_seconds.at(-1);
  if (!finalTimestamp)
    throw new Error("ElevenLabs returned an empty timestamp alignment.");

  const audioPlaybackRate =
    finalTimestamp > 29.5 ? Math.min(1.2, finalTimestamp / 29.5) : 1;
  const adjustedTime = (seconds: number) => seconds / audioPlaybackRate;

  let characterCursor = 0;
  let previousEndFrame = 0;
  const sceneRanges = storyboard.scenes.map((scene, index) => {
    const startCharacter = characterCursor;
    const endCharacter = startCharacter + scene.narration.length - 1;
    characterCursor = endCharacter + 1 + sceneSeparator.length;
    const measuredEnd = Math.round(
      adjustedTime(alignment.character_end_times_seconds[endCharacter]!) * fps,
    );
    const endFrame =
      index === storyboard.scenes.length - 1
        ? totalFrames
        : Math.min(
            totalFrames - 1,
            Math.max(previousEndFrame + 1, measuredEnd),
          );
    previousEndFrame = endFrame;
    return { sceneId: scene.id, startCharacter, endCharacter, endFrame };
  });

  let durationCursor = 0;
  const runtimeStoryboard = storyboardSchema.parse({
    ...structuredClone(storyboard),
    scenes: storyboard.scenes.map((scene, index) => {
      const endFrame = sceneRanges[index]!.endFrame;
      const durationInFrames = endFrame - durationCursor;
      durationCursor = endFrame;
      return { ...scene, durationEstimateSeconds: durationInFrames / fps };
    }),
  }) satisfies Storyboard;

  const timeline = compileTimeline(runtimeStoryboard);
  const captions: CaptionCue[] = [];
  const wordsPerCaption = 5;
  for (const [sceneIndex, scene] of runtimeStoryboard.scenes.entries()) {
    const range = sceneRanges[sceneIndex]!;
    const timelineScene = timeline[sceneIndex]!;
    const wordMatches = [...scene.narration.matchAll(/\S+/g)];
    for (let index = 0; index < wordMatches.length; index += wordsPerCaption) {
      const group = wordMatches.slice(index, index + wordsPerCaption);
      const first = group[0]!;
      const last = group.at(-1)!;
      const firstCharacter = range.startCharacter + first.index;
      const lastCharacter =
        range.startCharacter + last.index + last[0].length - 1;
      const rawStartFrame = Math.floor(
        adjustedTime(alignment.character_start_times_seconds[firstCharacter]!) *
          fps,
      );
      const rawEndFrame = Math.ceil(
        adjustedTime(alignment.character_end_times_seconds[lastCharacter]!) *
          fps,
      );
      const sceneEndFrame =
        timelineScene.fromFrame + timelineScene.durationInFrames;
      const startFrame = Math.max(timelineScene.fromFrame, rawStartFrame);
      const endFrame = Math.max(
        startFrame + 1,
        Math.min(sceneEndFrame, rawEndFrame),
      );
      captions.push({
        sceneId: scene.id,
        startFrame,
        endFrame,
        text: group.map((match) => match[0]).join(" "),
      });
    }
  }

  const storageDirectory = resolve(process.cwd(), "storage", slug);
  const publicDirectory = resolve(
    process.cwd(),
    "packages",
    "video",
    "public",
    "generated",
    slug,
  );
  await mkdir(storageDirectory, { recursive: true });
  await mkdir(publicDirectory, { recursive: true });
  await writeFile(resolve(publicDirectory, "narration.mp3"), speech.audio);
  await writeFile(
    resolve(storageDirectory, "alignment.json"),
    JSON.stringify(
      {
        narration,
        rawDurationSeconds: finalTimestamp,
        playbackRate: audioPlaybackRate,
        renderedDurationSeconds: finalTimestamp / audioPlaybackRate,
        alignment,
        captions,
      },
      null,
      2,
    ),
  );
  await writeFile(
    resolve(storageDirectory, "render-props.json"),
    JSON.stringify(
      {
        storyboard: runtimeStoryboard,
        audioFile: `generated/${slug}/narration.mp3`,
        audioPlaybackRate,
        captions,
      },
      null,
      2,
    ),
  );

  return {
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    rawDurationSeconds: Number(finalTimestamp.toFixed(3)),
    playbackRate: Number(audioPlaybackRate.toFixed(4)),
    renderedAudioSeconds: Number(
      (finalTimestamp / audioPlaybackRate).toFixed(3),
    ),
    captionCount: captions.length,
    output: `storage/${slug}/render-props.json`,
  };
};
