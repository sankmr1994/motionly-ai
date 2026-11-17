import { getR2Config } from "@motionly/config";
import {
  DeleteObjectsCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";

export type ByteRange = { start: number; end: number };

const safeObjectKey = /^[\p{L}\p{N}][\p{L}\p{N}\p{M}_./-]*$/u;
let client: S3Client | undefined;

function assertObjectKey(key: string) {
  if (
    !safeObjectKey.test(key) ||
    key.startsWith("/") ||
    key.endsWith("/") ||
    key
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid private object key.");
  }
}

export function isStoredAssetNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    name?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.code === "ENOENT" ||
    candidate.name === "NoSuchKey" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

function getClient() {
  const config = getR2Config();
  client ??= new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return { client, bucketName: config.bucketName };
}

export function isR2ObjectKey(key: string, prefix: "narrations" | "renders") {
  return (
    key.startsWith(`${prefix}/`) ||
    key.startsWith("projects/") ||
    key.startsWith("users/")
  );
}

export async function putPrivateObject(
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  assertObjectKey(key);
  const storage = getClient();
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucketName,
      Key: key,
      Body: body,
      ContentLength: body.byteLength,
      ContentType: contentType,
      CacheControl: "private, no-store",
    }),
  );
}

export async function putPrivateFile(
  key: string,
  path: string,
  byteLength: number,
  contentType: string,
) {
  assertObjectKey(key);
  const storage = getClient();
  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucketName,
      Key: key,
      Body: createReadStream(path),
      ContentLength: byteLength,
      ContentType: contentType,
      CacheControl: "private, no-store",
    }),
  );
}

export async function getPrivateObject(key: string, range?: ByteRange) {
  assertObjectKey(key);
  const storage = getClient();
  const response = await storage.client.send(
    new GetObjectCommand({
      Bucket: storage.bucketName,
      Key: key,
      ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
    }),
  );
  if (!response.Body) throw new Error("Stored object had no body.");
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function getPrivateObjectMetadata(key: string) {
  assertObjectKey(key);
  const storage = getClient();
  try {
    const response = await storage.client.send(
      new HeadObjectCommand({ Bucket: storage.bucketName, Key: key }),
    );
    return { exists: true as const, byteLength: response.ContentLength ?? 0 };
  } catch (error) {
    if (isStoredAssetNotFound(error)) {
      return { exists: false as const, byteLength: 0 };
    }
    throw error;
  }
}

export async function deletePrivatePrefix(prefix: string) {
  assertObjectKey(`${prefix}placeholder`);
  const storage = getClient();
  for (;;) {
    const listed = await storage.client.send(
      new ListObjectsV2Command({
        Bucket: storage.bucketName,
        Prefix: prefix,
        MaxKeys: 1_000,
      }),
    );
    const objects = (listed.Contents ?? [])
      .map(({ Key }) => Key)
      .filter((key): key is string => Boolean(key))
      .map((Key) => ({ Key }));
    if (objects.length === 0) return;
    const deleted = await storage.client.send(
      new DeleteObjectsCommand({
        Bucket: storage.bucketName,
        Delete: { Objects: objects, Quiet: true },
      }),
    );
    if (deleted.Errors?.length) {
      throw new Error("Private object cleanup did not delete every object.");
    }
  }
}

export async function deletePrivateObjects(keys: string[]) {
  const uniqueKeys = [...new Set(keys)];
  uniqueKeys.forEach(assertObjectKey);
  if (uniqueKeys.length === 0) return;
  const storage = getClient();
  for (let index = 0; index < uniqueKeys.length; index += 1_000) {
    const objects = uniqueKeys
      .slice(index, index + 1_000)
      .map((Key) => ({ Key }));
    const deleted = await storage.client.send(
      new DeleteObjectsCommand({
        Bucket: storage.bucketName,
        Delete: { Objects: objects, Quiet: true },
      }),
    );
    if (deleted.Errors?.length) {
      throw new Error("Private object cleanup did not delete every object.");
    }
  }
}

export async function deletePrivateObject(key: string) {
  assertObjectKey(key);
  const storage = getClient();
  await storage.client.send(
    new DeleteObjectCommand({ Bucket: storage.bucketName, Key: key }),
  );
}
