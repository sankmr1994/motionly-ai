import { ObjectId } from "mongodb";
import { getDatabase } from "./index";

type SceneVisualAssetDocument = {
  _id: ObjectId;
  ownerId: string;
  projectId: ObjectId;
  versionId: ObjectId;
  revision: number;
  sceneId: string;
  promptHash: string;
  promptVersion: string;
  provider: "GOOGLE_GEMINI";
  model: string;
  assetKey: string;
  mimeType: "image/png" | "image/jpeg";
  byteLength: number;
  width: 768;
  height: 1376;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: "1";
};

export type SceneVisualAsset = {
  id: string;
  sceneId: string;
  promptHash: string;
  promptVersion: string;
  model: string;
  assetKey: string;
  mimeType: "image/png" | "image/jpeg";
  byteLength: number;
  width: 768;
  height: 1376;
};

function toObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function toView(document: SceneVisualAssetDocument): SceneVisualAsset {
  return {
    id: document._id.toHexString(),
    sceneId: document.sceneId,
    promptHash: document.promptHash,
    promptVersion: document.promptVersion,
    model: document.model,
    assetKey: document.assetKey,
    mimeType: document.mimeType,
    byteLength: document.byteLength,
    width: document.width,
    height: document.height,
  };
}

export async function getSceneVisualAsset(input: {
  ownerId: string;
  versionId: string;
  sceneId: string;
  promptHash: string;
}): Promise<SceneVisualAsset | null> {
  const versionId = toObjectId(input.versionId);
  if (!versionId) return null;
  const document = await (
    await getDatabase()
  )
    .collection<SceneVisualAssetDocument>("sceneVisualAssets")
    .findOne({
      ownerId: input.ownerId,
      versionId,
      sceneId: input.sceneId,
      promptHash: input.promptHash,
    });
  return document ? toView(document) : null;
}

export async function saveSceneVisualAsset(input: {
  ownerId: string;
  projectId: string;
  versionId: string;
  revision: number;
  sceneId: string;
  promptHash: string;
  promptVersion: string;
  model: string;
  assetKey: string;
  mimeType: "image/png" | "image/jpeg";
  byteLength: number;
}): Promise<SceneVisualAsset> {
  const projectId = toObjectId(input.projectId);
  const versionId = toObjectId(input.versionId);
  if (!projectId || !versionId) {
    throw new Error("Scene visual identity is invalid.");
  }
  const now = new Date();
  const collection = (await getDatabase()).collection<SceneVisualAssetDocument>(
    "sceneVisualAssets",
  );
  await collection.updateOne(
    {
      ownerId: input.ownerId,
      versionId,
      sceneId: input.sceneId,
      promptHash: input.promptHash,
    },
    {
      $set: {
        projectId,
        revision: input.revision,
        promptVersion: input.promptVersion,
        provider: "GOOGLE_GEMINI",
        model: input.model,
        assetKey: input.assetKey,
        mimeType: input.mimeType,
        byteLength: input.byteLength,
        width: 768,
        height: 1376,
        updatedAt: now,
        schemaVersion: "1",
      },
      $setOnInsert: {
        _id: new ObjectId(),
        ownerId: input.ownerId,
        versionId,
        sceneId: input.sceneId,
        promptHash: input.promptHash,
        createdAt: now,
      },
    },
    { upsert: true },
  );
  const document = await collection.findOne({
    ownerId: input.ownerId,
    versionId,
    sceneId: input.sceneId,
    promptHash: input.promptHash,
  });
  if (!document) throw new Error("Scene visual asset was not saved.");
  return toView(document);
}
