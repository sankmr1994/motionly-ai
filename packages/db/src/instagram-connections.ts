import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDatabase } from "./index";

const oauthStateLifetimeMs = 10 * 60 * 1_000;

type InstagramOAuthStateDocument = {
  _id: ObjectId;
  ownerId: string;
  stateHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
  schemaVersion: "1";
};

type EncryptedToken = {
  algorithm: "aes-256-gcm";
  keyVersion: "1";
  iv: string;
  authTag: string;
  ciphertext: string;
};

type InstagramConnectionDocument = {
  _id: ObjectId;
  ownerId: string;
  provider: "INSTAGRAM";
  providerAccountId: string;
  username?: string;
  displayName?: string;
  accountType?: string;
  token: EncryptedToken;
  grantedScopes: string[];
  status: "CONNECTED" | "NEEDS_REAUTHORIZATION" | "DISCONNECTED";
  tokenExpiresAt?: Date;
  connectedAt: Date;
  lastVerifiedAt: Date;
  updatedAt: Date;
  schemaVersion: "1";
};

export type InstagramConnectionSummary = {
  id: string;
  accountId: string;
  username?: string;
  displayName?: string;
  accountType?: string;
  status: InstagramConnectionDocument["status"];
  grantedScopes: string[];
  connectedAt: string;
  lastVerifiedAt: string;
};

function hashState(state: string) {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

function toSummary(
  connection: InstagramConnectionDocument,
): InstagramConnectionSummary {
  return {
    id: connection._id.toHexString(),
    accountId: connection.providerAccountId,
    username: connection.username,
    displayName: connection.displayName,
    accountType: connection.accountType,
    status: connection.status,
    grantedScopes: connection.grantedScopes,
    connectedAt: connection.connectedAt.toISOString(),
    lastVerifiedAt: connection.lastVerifiedAt.toISOString(),
  };
}

export async function createInstagramOAuthState(ownerId: string) {
  const state = randomBytes(32).toString("base64url");
  const now = new Date();
  const database = await getDatabase();
  await database
    .collection<InstagramOAuthStateDocument>("instagramOAuthStates")
    .insertOne({
      _id: new ObjectId(),
      ownerId,
      stateHash: hashState(state),
      expiresAt: new Date(now.getTime() + oauthStateLifetimeMs),
      createdAt: now,
      schemaVersion: "1",
    });
  return state;
}

export async function consumeInstagramOAuthState(
  ownerId: string,
  state: string,
) {
  const now = new Date();
  const database = await getDatabase();
  const result = await database
    .collection<InstagramOAuthStateDocument>("instagramOAuthStates")
    .findOneAndUpdate(
      {
        ownerId,
        stateHash: hashState(state),
        consumedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
      { returnDocument: "after" },
    );
  return Boolean(result);
}

export async function getInstagramConnection(
  ownerId: string,
): Promise<InstagramConnectionSummary | null> {
  const database = await getDatabase();
  const connection = await database
    .collection<InstagramConnectionDocument>("socialConnections")
    .findOne({ ownerId, provider: "INSTAGRAM" });
  return connection ? toSummary(connection) : null;
}

export async function saveInstagramConnection(input: {
  ownerId: string;
  providerAccountId: string;
  username?: string;
  displayName?: string;
  accountType?: string;
  token: EncryptedToken;
  grantedScopes: string[];
  tokenExpiresAt?: Date;
}): Promise<InstagramConnectionSummary> {
  const database = await getDatabase();
  const now = new Date();
  const collection =
    database.collection<InstagramConnectionDocument>("socialConnections");
  await collection.updateOne(
    { ownerId: input.ownerId, provider: "INSTAGRAM" },
    {
      $set: {
        providerAccountId: input.providerAccountId,
        username: input.username,
        displayName: input.displayName,
        accountType: input.accountType,
        token: input.token,
        grantedScopes: [...new Set(input.grantedScopes)].sort(),
        status: "CONNECTED",
        tokenExpiresAt: input.tokenExpiresAt,
        lastVerifiedAt: now,
        updatedAt: now,
        schemaVersion: "1",
      },
      $setOnInsert: {
        _id: new ObjectId(),
        ownerId: input.ownerId,
        provider: "INSTAGRAM",
        connectedAt: now,
      },
    },
    { upsert: true },
  );
  const connection = await collection.findOne({
    ownerId: input.ownerId,
    provider: "INSTAGRAM",
  });
  if (!connection) throw new Error("Instagram connection was not saved.");
  return toSummary(connection);
}
