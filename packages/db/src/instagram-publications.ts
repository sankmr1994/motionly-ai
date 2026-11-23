import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "./index";

export type InstagramPublicationStatus =
  | "QUEUED"
  | "CREATING_CONTAINER"
  | "PROCESSING_CONTAINER"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED";

type InstagramPublicationDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  renderJobId: ObjectId;
  connectionId: ObjectId;
  providerAccountId: string;
  caption: string;
  shareToFeed: boolean;
  status: InstagramPublicationStatus;
  mediaTokenHash: string;
  mediaTokenExpiresAt: Date;
  assetKey: string;
  mimeType: "video/mp4";
  byteLength: number;
  providerContainerId?: string;
  providerMediaId?: string;
  permalink?: string;
  error?: { safeMessage: string; occurredAt: Date };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  schemaVersion: "1";
};

export type InstagramPublicationView = {
  id: string;
  status: InstagramPublicationStatus;
  caption: string;
  shareToFeed: boolean;
  permalink?: string;
  error?: { safeMessage: string };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

function hashMediaToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function toView(
  document: InstagramPublicationDocument,
): InstagramPublicationView {
  return {
    id: document._id.toHexString(),
    status: document.status,
    caption: document.caption,
    shareToFeed: document.shareToFeed,
    permalink: document.permalink,
    error: document.error
      ? { safeMessage: document.error.safeMessage }
      : undefined,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    publishedAt: document.publishedAt?.toISOString(),
  };
}

export async function beginInstagramPublication(input: {
  ownerId: string;
  projectId: string;
  renderJobId: string;
  connectionId: string;
  providerAccountId: string;
  caption: string;
  shareToFeed: boolean;
  mediaToken: string;
  mediaTokenExpiresAt: Date;
  assetKey: string;
  byteLength: number;
}) {
  const projectId = ObjectId.isValid(input.projectId)
    ? new ObjectId(input.projectId)
    : null;
  const renderJobId = ObjectId.isValid(input.renderJobId)
    ? new ObjectId(input.renderJobId)
    : null;
  const connectionId = ObjectId.isValid(input.connectionId)
    ? new ObjectId(input.connectionId)
    : null;
  if (!projectId || !renderJobId || !connectionId) return null;
  const collection = (
    await getDatabase()
  ).collection<InstagramPublicationDocument>("publicationJobs");
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 15 * 60 * 1_000);
  const existing = await collection.findOne({
    ownerId: input.ownerId,
    renderJobId,
  });
  if (
    existing &&
    (existing.status === "PUBLISHED" ||
      (existing.status !== "FAILED" && existing.updatedAt > staleBefore))
  ) {
    return { publication: toView(existing), reused: true };
  }
  const document: InstagramPublicationDocument = {
    _id: existing?._id ?? new ObjectId(),
    ownerId: input.ownerId,
    projectId,
    renderJobId,
    connectionId,
    providerAccountId: input.providerAccountId,
    caption: input.caption,
    shareToFeed: input.shareToFeed,
    status: "QUEUED",
    mediaTokenHash: hashMediaToken(input.mediaToken),
    mediaTokenExpiresAt: input.mediaTokenExpiresAt,
    assetKey: input.assetKey,
    mimeType: "video/mp4",
    byteLength: input.byteLength,
    createdAt: now,
    updatedAt: now,
    schemaVersion: "1",
  };
  if (existing) {
    const reset = await collection.replaceOne(
      {
        _id: existing._id,
        ownerId: input.ownerId,
        $or: [
          { status: "FAILED" },
          {
            status: { $ne: "PUBLISHED" },
            updatedAt: { $lte: staleBefore },
          },
        ],
      },
      document,
    );
    if (reset.modifiedCount === 1) {
      return { publication: toView(document), reused: false };
    }
    const current = await collection.findOne({ _id: existing._id });
    return current ? { publication: toView(current), reused: true } : null;
  }
  try {
    await collection.insertOne(document);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) {
      throw error;
    }
    const current = await collection.findOne({
      ownerId: input.ownerId,
      renderJobId,
    });
    return current ? { publication: toView(current), reused: true } : null;
  }
  return { publication: toView(document), reused: false };
}

export async function updateInstagramPublication(
  ownerId: string,
  publicationId: string,
  update: {
    status: InstagramPublicationStatus;
    providerContainerId?: string;
    providerMediaId?: string;
    permalink?: string;
  },
) {
  if (!ObjectId.isValid(publicationId)) return false;
  const now = new Date();
  const result = await (
    await getDatabase()
  )
    .collection<InstagramPublicationDocument>("publicationJobs")
    .updateOne(
      { _id: new ObjectId(publicationId), ownerId },
      {
        $set: {
          status: update.status,
          updatedAt: now,
          ...(update.providerContainerId
            ? { providerContainerId: update.providerContainerId }
            : {}),
          ...(update.providerMediaId
            ? { providerMediaId: update.providerMediaId }
            : {}),
          ...(update.permalink ? { permalink: update.permalink } : {}),
          ...(update.status === "PUBLISHED" ? { publishedAt: now } : {}),
        },
        $unset: { error: "" },
      },
    );
  return result.matchedCount === 1;
}

export async function failInstagramPublication(
  ownerId: string,
  publicationId: string,
  safeMessage: string,
) {
  if (!ObjectId.isValid(publicationId)) return;
  const now = new Date();
  await (
    await getDatabase()
  )
    .collection<InstagramPublicationDocument>("publicationJobs")
    .updateOne(
      {
        _id: new ObjectId(publicationId),
        ownerId,
        status: { $ne: "PUBLISHED" },
      },
      {
        $set: {
          status: "FAILED",
          error: { safeMessage, occurredAt: now },
          updatedAt: now,
        },
      },
    );
}

export async function getLatestInstagramPublication(
  ownerId: string,
  projectId: string,
): Promise<InstagramPublicationView | null> {
  if (!ObjectId.isValid(projectId)) return null;
  const document = await (
    await getDatabase()
  )
    .collection<InstagramPublicationDocument>("publicationJobs")
    .findOne(
      { ownerId, projectId: new ObjectId(projectId) },
      { sort: { createdAt: -1 } },
    );
  return document ? toView(document) : null;
}

export async function getInstagramPublicationMedia(mediaToken: string) {
  const now = new Date();
  const document = await (
    await getDatabase()
  )
    .collection<InstagramPublicationDocument>("publicationJobs")
    .findOne({
      mediaTokenHash: hashMediaToken(mediaToken),
      mediaTokenExpiresAt: { $gt: now },
      status: {
        $in: [
          "QUEUED",
          "CREATING_CONTAINER",
          "PROCESSING_CONTAINER",
          "PUBLISHING",
        ],
      },
    });
  if (!document) return null;
  return {
    assetKey: document.assetKey,
    mimeType: document.mimeType,
    byteLength: document.byteLength,
  };
}
