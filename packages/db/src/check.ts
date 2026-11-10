import { getDatabaseConfig } from "@motionly/config";
import { closeDatabaseConnection, getDatabase } from "./index";

function classifyConnectionError(error: unknown) {
  if (!(error instanceof Error)) return "UNKNOWN";

  const message = error.message.toLowerCase();
  if (message.includes("invalid server environment"))
    return "ENVIRONMENT_INVALID";
  if (message.includes("database is not configured"))
    return "DATABASE_CONFIG_MISSING";
  if (message.includes("authentication failed")) return "AUTHENTICATION_FAILED";
  if (message.includes("bad auth")) return "AUTHENTICATION_FAILED";
  if (message.includes("querytxt")) return "DNS_TXT_LOOKUP_FAILED";
  if (message.includes("querysrv")) return "DNS_SRV_LOOKUP_FAILED";
  if (message.includes("enotfound")) return "DNS_OR_CLUSTER_HOST_FAILED";
  if (message.includes("ip") && message.includes("allow"))
    return "NETWORK_ACCESS_NOT_ALLOWED";
  if (message.includes("whitelist")) return "NETWORK_ACCESS_NOT_ALLOWED";
  if (message.includes("uri") || message.includes("connection string"))
    return "CONNECTION_STRING_INVALID";
  if (error.name === "MongoParseError") return "CONNECTION_STRING_INVALID";
  if (error.name === "MongoServerSelectionError")
    return "CLUSTER_UNREACHABLE_OR_NOT_ALLOWED";

  return "UNCLASSIFIED";
}

async function checkConnection() {
  const config = getDatabaseConfig();
  const database = await getDatabase();
  const result = await database.command({ ping: 1 });

  if (result.ok !== 1) {
    throw new Error("MongoDB ping did not return an OK result.");
  }

  console.info(
    JSON.stringify({
      status: "ok",
      database: config.databaseName,
      message: "MongoDB connection and ping succeeded.",
    }),
  );
}

checkConnection()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        status: "error",
        message: "MongoDB connection failed.",
        errorType: error instanceof Error ? error.name : "UnknownError",
        reason: classifyConnectionError(error),
      }),
    );
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
