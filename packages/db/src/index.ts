import { getDatabaseConfig } from "@motionly/config";
import dns from "node:dns";
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
}

export async function getDatabase(): Promise<Db> {
  if (database) return database;

  const config = getDatabaseConfig();
  configureDnsServers(config.dnsServers);
  client ??= new MongoClient(config.uri, {
    appName: "motionly-ai",
    serverSelectionTimeoutMS: 3_000,
  });
  await client.connect();
  database = client.db(config.databaseName);
  return database;
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
