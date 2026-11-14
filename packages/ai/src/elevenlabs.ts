import { getElevenLabsConfig } from "./env";

export interface SpeechAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface TimestampedSpeech {
  audio: Uint8Array;
  alignment: SpeechAlignment | null;
  normalizedAlignment: SpeechAlignment | null;
}

interface ElevenLabsTimestampResponse {
  audio_base64: string;
  alignment: SpeechAlignment | null;
  normalized_alignment: SpeechAlignment | null;
}

export class SpeechGenerationError extends Error {
  constructor(
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super("ELEVENLABS_SPEECH_GENERATION_FAILED", options);
    this.name = "SpeechGenerationError";
  }
}

export function getSpeechDurationSeconds(speech: TimestampedSpeech) {
  const alignment = speech.normalizedAlignment ?? speech.alignment;
  return alignment?.character_end_times_seconds.at(-1) ?? 0;
}

export const generateTimestampedSpeech = async (
  text: string,
  options: { speed?: number } = {},
): Promise<TimestampedSpeech> => {
  const { apiKey, voiceId, modelId } = getElevenLabsConfig();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          speed: options.speed ?? 1.08,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new SpeechGenerationError(response.status);
  }

  const payload = (await response.json()) as ElevenLabsTimestampResponse;
  const speech = {
    audio: Uint8Array.from(Buffer.from(payload.audio_base64, "base64")),
    alignment: payload.alignment,
    normalizedAlignment: payload.normalized_alignment,
  };
  if (!speech.audio.length || getSpeechDurationSeconds(speech) <= 0) {
    throw new SpeechGenerationError();
  }
  return speech;
};
