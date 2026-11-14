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
  {
    id: "002-planning-job-indexes",
    description: "Add owner and project indexes for durable planning jobs",
    async up(database) {
      await database
        .collection("planningJobs")
        .createIndex({ ownerId: 1, createdAt: -1, _id: -1 });
      await database
        .collection("planningJobs")
        .createIndex({ projectId: 1, createdAt: -1 });
      await database
        .collection("planningJobs")
        .createIndex({ status: 1, updatedAt: 1 });
      await database.collection("planningJobs").createIndex(
        { ownerId: 1, projectId: 1, status: 1 },
        {
          partialFilterExpression: { status: "GENERATING" },
        },
      );
    },
  },
  {
    id: "003-narration-job-indexes",
    description: "Add owner, project, and active narration job indexes",
    async up(database) {
      await database
        .collection("narrationJobs")
        .createIndex({ ownerId: 1, createdAt: -1, _id: -1 });
      await database
        .collection("narrationJobs")
        .createIndex({ ownerId: 1, projectId: 1, createdAt: -1 });
      await database
        .collection("narrationJobs")
        .createIndex({ ownerId: 1, versionId: 1, status: 1 });
      await database.collection("narrationJobs").createIndex(
        { ownerId: 1, projectId: 1, versionId: 1, status: 1 },
        {
          unique: true,
          partialFilterExpression: { status: "GENERATING" },
        },
      );
    },
  },
];
