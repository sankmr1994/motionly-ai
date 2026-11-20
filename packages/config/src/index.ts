import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional().or(z.literal(""));

export const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_ENV: z
      .enum(["local", "preview", "production", "test"])
      .default("local"),
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
    ELEVENLABS_VOICE_NAME: z
      .string()
      .trim()
      .min(1)
      .default("Motionly Indian Educator"),
    BETTER_AUTH_SECRET: z.string().trim().min(32).optional(),
    RESEND_API_KEY: optionalSecret,
    RESEND_FROM_EMAIL: z.string().trim().email().optional(),
    MOTIONLY_ADMIN_EMAILS: z.string().trim().optional(),
    META_APP_ID: optionalSecret,
    META_APP_SECRET: optionalSecret,
    META_INSTAGRAM_CONFIG_ID: optionalSecret,
    META_INSTAGRAM_REDIRECT_URI: z.url().optional().or(z.literal("")),
    META_GRAPH_VERSION: z
      .string()
      .trim()
      .regex(/^v\d+\.\d+$/)
      .default("v27.0"),
    INTEGRATION_ENCRYPTION_KEY: optionalSecret,
    R2_ACCOUNT_ID: optionalSecret,
    R2_BUCKET_NAME: optionalSecret,
    R2_ENDPOINT: optionalSecret,
    R2_ACCESS_KEY_ID: optionalSecret,
    R2_SECRET_ACCESS_KEY: optionalSecret,
  })
  .superRefine((environment, context) => {
    const keys = [
      "R2_ACCOUNT_ID",
      "R2_BUCKET_NAME",
      "R2_ENDPOINT",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
    ] as const;
    const configured = keys.filter((key) => environment[key]);
    if (configured.length > 0 && configured.length < keys.length) {
      context.addIssue({
        code: "custom",
        path: ["R2_ENDPOINT"],
        message: "All Cloudflare R2 settings must be configured together",
      });
      return;
    }
    if (configured.length === keys.length) {
      let endpoint: URL;
      try {
        endpoint = new URL(environment.R2_ENDPOINT!);
      } catch {
        context.addIssue({
          code: "custom",
          path: ["R2_ENDPOINT"],
          message: "R2_ENDPOINT must be a valid URL",
        });
        return;
      }
      if (
        endpoint.protocol !== "https:" ||
        !endpoint.hostname.startsWith(`${environment.R2_ACCOUNT_ID}.`)
      ) {
        context.addIssue({
          code: "custom",
          path: ["R2_ENDPOINT"],
          message: "R2_ENDPOINT must be the HTTPS endpoint for R2_ACCOUNT_ID",
        });
      }
    }

    const metaKeys = [
      "META_APP_ID",
      "META_APP_SECRET",
      "META_INSTAGRAM_CONFIG_ID",
      "META_INSTAGRAM_REDIRECT_URI",
      "INTEGRATION_ENCRYPTION_KEY",
    ] as const;
    const configuredMetaKeys = metaKeys.filter((key) => environment[key]);
    if (
      configuredMetaKeys.length > 0 &&
      configuredMetaKeys.length < metaKeys.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["META_APP_ID"],
        message: "All Meta Instagram settings must be configured together",
      });
    }
    if (
      environment.META_INSTAGRAM_REDIRECT_URI &&
      !environment.META_INSTAGRAM_REDIRECT_URI.startsWith("https://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["META_INSTAGRAM_REDIRECT_URI"],
        message: "META_INSTAGRAM_REDIRECT_URI must use HTTPS",
      });
    }
    if (environment.INTEGRATION_ENCRYPTION_KEY) {
      try {
        const decoded = Buffer.from(
          environment.INTEGRATION_ENCRYPTION_KEY,
          "base64",
        );
        if (decoded.length !== 32) throw new Error("invalid length");
      } catch {
        context.addIssue({
          code: "custom",
          path: ["INTEGRATION_ENCRYPTION_KEY"],
          message:
            "INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
        });
      }
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnvironment {
  const normalizedSource = { ...source };
  const vercelEnvironment = source.VERCEL_ENV?.trim();

  if (!normalizedSource.APP_ENV) {
    if (vercelEnvironment === "production") {
      normalizedSource.APP_ENV = "production";
    } else if (vercelEnvironment === "preview") {
      normalizedSource.APP_ENV = "preview";
    } else if (vercelEnvironment === "development") {
      normalizedSource.APP_ENV = "local";
    }
  }

  if (!normalizedSource.APP_URL && vercelEnvironment) {
    const deploymentHost =
      vercelEnvironment === "production"
        ? (source.VERCEL_PROJECT_PRODUCTION_URL ?? source.VERCEL_URL)
        : (source.VERCEL_BRANCH_URL ?? source.VERCEL_URL);
    if (deploymentHost?.trim()) {
      normalizedSource.APP_URL = `https://${deploymentHost.trim()}`;
    }
  }

  const result = serverEnvironmentSchema.safeParse(normalizedSource);

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

export function getR2Config(): {
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  const environment = getServerEnv();
  if (
    !environment.R2_ENDPOINT ||
    !environment.R2_BUCKET_NAME ||
    !environment.R2_ACCESS_KEY_ID ||
    !environment.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      "Object storage is not configured. Set all Cloudflare R2 environment variables.",
    );
  }
  return {
    endpoint: environment.R2_ENDPOINT,
    bucketName: environment.R2_BUCKET_NAME,
    accessKeyId: environment.R2_ACCESS_KEY_ID,
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
  };
}

export function getAdminEmails(): string[] {
  const configured = getServerEnv().MOTIONLY_ADMIN_EMAILS;
  if (!configured) return [];
  const emails = configured
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("en"))
    .filter(Boolean);
  const emailSchema = z.string().email();
  if (emails.some((email) => !emailSchema.safeParse(email).success)) {
    throw new Error(
      "MOTIONLY_ADMIN_EMAILS must contain comma-separated email addresses.",
    );
  }
  return [...new Set(emails)];
}

export function getInstagramConfig(): {
  appId: string;
  appSecret: string;
  configurationId: string;
  redirectUri: string;
  graphVersion: string;
  encryptionKey: string;
} {
  const environment = getServerEnv();
  if (
    !environment.META_APP_ID ||
    !environment.META_APP_SECRET ||
    !environment.META_INSTAGRAM_CONFIG_ID ||
    !environment.META_INSTAGRAM_REDIRECT_URI ||
    !environment.INTEGRATION_ENCRYPTION_KEY
  ) {
    throw new Error(
      "Instagram is not configured. Set all Meta Instagram environment variables.",
    );
  }
  return {
    appId: environment.META_APP_ID,
    appSecret: environment.META_APP_SECRET,
    configurationId: environment.META_INSTAGRAM_CONFIG_ID,
    redirectUri: environment.META_INSTAGRAM_REDIRECT_URI,
    graphVersion: environment.META_GRAPH_VERSION,
    encryptionKey: environment.INTEGRATION_ENCRYPTION_KEY,
  };
}

export function isInstagramConfigured(): boolean {
  const environment = getServerEnv();
  return Boolean(
    environment.META_APP_ID &&
    environment.META_APP_SECRET &&
    environment.META_INSTAGRAM_CONFIG_ID &&
    environment.META_INSTAGRAM_REDIRECT_URI &&
    environment.INTEGRATION_ENCRYPTION_KEY,
  );
}
