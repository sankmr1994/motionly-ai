import { getDatabaseConfig } from "@motionly/config";
import dns, { promises as dnsPromises } from "node:dns";
import { isIP } from "node:net";
import { Db, MongoClient } from "mongodb";

let client: MongoClient | undefined;
let database: Db | undefined;

function configureDnsServers(configuredServers?: string) {
  if (!configuredServers) return;

  const servers = configuredServers
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length === 0 || servers.some((server) => isIP(server) === 0)) {
    throw new Error(
      "MONGODB_DNS_SERVERS must contain comma-separated IPv4 or IPv6 addresses.",
    );
  }

  dns.setServers(servers);
  dnsPromises.setServers(servers);
}

function getDatabaseResources(): { client: MongoClient; database: Db } {
  const config = getDatabaseConfig();
  configureDnsServers(config.dnsServers);
  client ??= new MongoClient(config.uri, {
    appName: "motionly-ai",
    serverSelectionTimeoutMS: 15_000,
  });
  database ??= client.db(config.databaseName);
  return { client, database };
}

export function getDatabaseClient(): MongoClient {
  return getDatabaseResources().client;
}

export function getDatabaseHandle(): Db {
  return getDatabaseResources().database;
}

export async function getDatabase(): Promise<Db> {
  const resources = getDatabaseResources();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await resources.client.connect();
      return resources.database;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error("Database connection failed after retries.");
}

export async function checkDatabaseConnection(): Promise<
  { status: "ok" } | { status: "error"; message: string }
> {
  try {
    const connection = await getDatabase();
    await connection.command({ ping: 1 });
    return { status: "ok" };
  } catch {
    return {
      status: "error",
      message: "Database connection failed.",
    };
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await client?.close();
  client = undefined;
  database = undefined;
}

export * from "./projects";
