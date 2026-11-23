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
  {
    id: "004-render-job-indexes",
    description: "Add owner, project, and active video render job indexes",
    async up(database) {
      await database
        .collection("renderJobs")
        .createIndex({ ownerId: 1, createdAt: -1, _id: -1 });
      await database
        .collection("renderJobs")
        .createIndex({ ownerId: 1, projectId: 1, createdAt: -1 });
      await database
        .collection("renderJobs")
        .createIndex({ ownerId: 1, versionId: 1, status: 1 });
      await database.collection("renderJobs").createIndex(
        { ownerId: 1, projectId: 1, inputHash: 1, status: 1 },
        {
          unique: true,
          partialFilterExpression: { status: "RENDERING" },
        },
      );
    },
  },
  {
    id: "005-topic-suggestion-cache-indexes",
    description: "Add owner-scoped and expiry indexes for topic suggestions",
    async up(database) {
      await database
        .collection("topicSuggestionCaches")
        .createIndex({ ownerId: 1, cacheKey: 1 }, { unique: true });
      await database
        .collection("topicSuggestionCaches")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    },
  },
  {
    id: "006-instagram-connection-indexes",
    description:
      "Add owner-scoped Instagram connection and OAuth state indexes",
    async up(database) {
      await database
        .collection("socialConnections")
        .createIndex({ ownerId: 1, provider: 1 }, { unique: true });
      await database
        .collection("socialConnections")
        .createIndex({ provider: 1, status: 1, updatedAt: -1 });
      await database
        .collection("instagramOAuthStates")
        .createIndex({ stateHash: 1 }, { unique: true });
      await database
        .collection("instagramOAuthStates")
        .createIndex({ ownerId: 1, createdAt: -1 });
      await database
        .collection("instagramOAuthStates")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    },
  },
  {
    id: "007-instagram-publication-indexes",
    description:
      "Add owner-scoped Instagram publication and media-token indexes",
    async up(database) {
      await database
        .collection("publicationJobs")
        .createIndex({ ownerId: 1, projectId: 1, createdAt: -1 });
      await database
        .collection("publicationJobs")
        .createIndex({ mediaTokenHash: 1 }, { unique: true });
      await database
        .collection("publicationJobs")
        .createIndex(
          { ownerId: 1, renderJobId: 1 },
          { name: "publication_by_render", unique: true },
        );
      await database
        .collection("publicationJobs")
        .createIndex({ mediaTokenExpiresAt: 1 });
    },
  },
];
