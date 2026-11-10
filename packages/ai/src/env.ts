const requireEnvironmentVariable = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to a local environment file and set it without committing the secret.`,
    );
  }
  return value;
};

export const getGeminiConfig = () => ({
  apiKey: requireEnvironmentVariable("GEMINI_API_KEY"),
  model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
});

export const getElevenLabsConfig = () => ({
  apiKey: requireEnvironmentVariable("ELEVENLABS_API_KEY"),
  voiceId: requireEnvironmentVariable("ELEVENLABS_VOICE_ID"),
  modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
});
