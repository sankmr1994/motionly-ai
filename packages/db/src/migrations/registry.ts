import type { Migration } from "./types";

// Add forward-only, idempotent migrations here in ascending ID order.
export const migrations: Migration[] = [
  {
    id: "001-project-foundation-indexes",
    description: "Add owner-scoped project and immutable version indexes",
    async up(database) {
      await database
        .collection("projects")
        .createIndex({ ownerId: 1, updatedAt: -1, _id: -1 });
      await database
        .collection("projects")
        .createIndex({ ownerId: 1, status: 1, updatedAt: -1, _id: -1 });
      await database
        .collection("projectVersions")
        .createIndex({ projectId: 1, revision: 1 }, { unique: true });
      await database.collection("projectVersions").createIndex({
        ownerId: 1,
        projectId: 1,
        revision: -1,
      });
    },
  },
];
