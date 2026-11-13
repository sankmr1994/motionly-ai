import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional().or(z.literal(""));

export const serverEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z.enum(["local", "preview", "production", "test"]).default("local"),
  APP_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  MONGODB_URI: z.string().trim().min(1).optional(),
  MONGODB_DB_NAME: z.string().trim().min(1).optional(),
  MONGODB_DNS_SERVERS: z.string().trim().min(1).optional(),
  GEMINI_API_KEY: optionalSecret,
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.5-flash-lite"),
  GEMINI_FALLBACK_MODEL: z.string().trim().min(1).default("gemini-3.5-flash"),
  ELEVENLABS_API_KEY: optionalSecret,
  ELEVENLABS_VOICE_ID: optionalSecret,
  ELEVENLABS_MODEL_ID: z
    .string()
    .trim()
    .min(1)
    .default("eleven_multilingual_v2"),
  BETTER_AUTH_SECRET: z.string().trim().min(32).optional(),
  RESEND_API_KEY: optionalSecret,
  RESEND_FROM_EMAIL: z.string().trim().email().optional(),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
      )
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  return result.data;
}

export function getServerEnv(): ServerEnvironment {
  cachedEnvironment ??= parseServerEnv(process.env);
  return cachedEnvironment;
}

export function getDatabaseConfig(): {
  uri: string;
  databaseName: string;
  dnsServers?: string;
} {
  const environment = getServerEnv();

  if (!environment.MONGODB_URI || !environment.MONGODB_DB_NAME) {
    throw new Error(
      "Database is not configured. Set MONGODB_URI and MONGODB_DB_NAME.",
    );
  }

  return {
    uri: environment.MONGODB_URI,
    databaseName: environment.MONGODB_DB_NAME,
    dnsServers: environment.MONGODB_DNS_SERVERS,
  };
}
