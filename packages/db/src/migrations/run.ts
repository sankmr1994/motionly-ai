import { closeDatabaseConnection, getDatabase } from "../index";
import { migrations } from "./registry";

const migrationCollection = "_motionly_migrations";

async function runMigrations() {
  const database = await getDatabase();
  const records = database.collection<{ id: string }>(migrationCollection);
  await records.createIndex({ id: 1 }, { unique: true });

  for (const migration of migrations) {
    const completed = await records.findOne({ id: migration.id });
    if (completed) continue;

    await migration.up(database);
    await records.insertOne({
      id: migration.id,
      description: migration.description,
      appliedAt: new Date(),
    } as { id: string });
  }
}

runMigrations()
  .then(() => {
    console.info("Database migrations are up to date.");
  })
  .catch((error: unknown) => {
    console.error(
      "Database migration failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
