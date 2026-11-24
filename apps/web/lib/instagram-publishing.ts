import { getInstagramConfig, getServerEnv } from "@motionly/config";
import {
  beginInstagramPublication,
  failInstagramPublication,
  getApprovedRenderPublicationSource,
  getInstagramConnectionCredentials,
  updateInstagramPublication,
} from "@motionly/db";
import { randomBytes } from "node:crypto";
import { decryptInstagramToken } from "./instagram-oauth";

type MetaResponse = {
  id?: string;
  status_code?: string;
  status?: string;
  permalink?: string;
  error?: { message?: string; code?: number; error_subcode?: number };
};

export class InstagramPublishingError extends Error {
  constructor(public readonly safeMessage: string) {
    super(safeMessage);
    this.name = "InstagramPublishingError";
  }
}

async function metaRequest(url: URL, init: RequestInit): Promise<MetaResponse> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = (await response.json().catch(() => null)) as MetaResponse | null;
  if (!response.ok || !body || body.error) {
    const providerMessage = body?.error?.message?.slice(0, 240);
    throw new Error(
      providerMessage
        ? `Instagram API rejected the request: ${providerMessage}`
        : `Instagram API request failed with status ${response.status}.`,
    );
  }
  return body;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function isInstagramReelCompatible(source: {
  mimeType: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  byteLength: number;
}) {
  return (
    source.mimeType === "video/mp4" &&
    source.width === 720 &&
    source.height === 1280 &&
    source.fps >= 23 &&
    source.fps <= 60 &&
    source.durationSeconds >= 3 &&
    source.durationSeconds <= 900 &&
    source.byteLength <= 1_000_000_000
  );
}

export function getInstagramReelThumbnailOffset(durationSeconds: number) {
  const durationMilliseconds = Math.max(0, Math.floor(durationSeconds * 1_000));
  const preferredOffset = Math.min(
    3_000,
    Math.floor(durationMilliseconds / 10),
  );
  return String(Math.max(1_000, preferredOffset));
}

export async function publishApprovedVideoToInstagram(input: {
  ownerId: string;
  projectId: string;
  renderJobId: string;
  caption: string;
  shareToFeed: boolean;
}) {
  const caption = input.caption.trim();
  if (!caption || caption.length > 2_200) {
    throw new InstagramPublishingError(
      "Add a caption between 1 and 2,200 characters.",
    );
  }
  const [connection, source] = await Promise.all([
    getInstagramConnectionCredentials(input.ownerId),
    getApprovedRenderPublicationSource(
      input.ownerId,
      input.projectId,
      input.renderJobId,
    ),
  ]);
  if (!connection) {
    throw new InstagramPublishingError(
      "Connect an Instagram Creator or Business account in Settings first.",
    );
  }
  if (!source) {
    throw new InstagramPublishingError(
      "Approve the finished video before publishing it to Instagram.",
    );
  }
  if (!isInstagramReelCompatible(source)) {
    throw new InstagramPublishingError(
      "This video does not meet Instagram Reel media requirements.",
    );
  }

  const config = getInstagramConfig();
  const mediaToken = randomBytes(32).toString("base64url");
  const created = await beginInstagramPublication({
    ownerId: input.ownerId,
    projectId: input.projectId,
    renderJobId: input.renderJobId,
    connectionId: connection.id,
    providerAccountId: connection.accountId,
    caption,
    shareToFeed: input.shareToFeed,
    mediaToken,
    mediaTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1_000),
    assetKey: source.assetKey,
    byteLength: source.byteLength,
  });
  if (!created) {
    throw new InstagramPublishingError("The publication could not be created.");
  }
  if (created.reused) {
    if (created.publication.status === "PUBLISHED") return created.publication;
    throw new InstagramPublishingError(
      "This video is already being sent to Instagram. Refresh shortly to see its status.",
    );
  }

  const publicationId = created.publication.id;
  try {
    const accessToken = decryptInstagramToken(
      connection.token,
      config.encryptionKey,
    );
    const mediaUrl = new URL(
      `/api/v1/integrations/instagram/media/${mediaToken}`,
      getServerEnv().APP_URL,
    ).toString();
    const accountBase = `https://${connection.apiHost}/${config.graphVersion}/${connection.accountId}`;

    await updateInstagramPublication(input.ownerId, publicationId, {
      status: "CREATING_CONTAINER",
    });
    const createBody = new URLSearchParams({
      media_type: "REELS",
      video_url: mediaUrl,
      caption,
      share_to_feed: String(input.shareToFeed),
      thumb_offset: getInstagramReelThumbnailOffset(source.durationSeconds),
      access_token: accessToken,
    });
    const container = await metaRequest(new URL(`${accountBase}/media`), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
    });
    if (!container.id)
      throw new Error("Instagram did not return a media container ID.");
    await updateInstagramPublication(input.ownerId, publicationId, {
      status: "PROCESSING_CONTAINER",
      providerContainerId: container.id,
    });

    let finished = false;
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const statusUrl = new URL(
        `https://${connection.apiHost}/${config.graphVersion}/${container.id}`,
      );
      statusUrl.searchParams.set("fields", "status_code,status");
      statusUrl.searchParams.set("access_token", accessToken);
      const status = await metaRequest(statusUrl, { method: "GET" });
      const code = status.status_code?.toUpperCase();
      if (code === "FINISHED" || code === "PUBLISHED") {
        finished = true;
        break;
      }
      if (code === "ERROR" || code === "EXPIRED") {
        throw new Error(
          status.status ?? `Instagram container ${code.toLowerCase()}.`,
        );
      }
      await wait(5_000);
    }
    if (!finished) {
      throw new Error("Instagram took too long to process the Reel.");
    }

    await updateInstagramPublication(input.ownerId, publicationId, {
      status: "PUBLISHING",
      providerContainerId: container.id,
    });
    const publishBody = new URLSearchParams({
      creation_id: container.id,
      access_token: accessToken,
    });
    const published = await metaRequest(
      new URL(`${accountBase}/media_publish`),
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishBody,
      },
    );
    if (!published.id)
      throw new Error("Instagram did not return a published media ID.");

    const mediaDetailsUrl = new URL(
      `https://${connection.apiHost}/${config.graphVersion}/${published.id}`,
    );
    mediaDetailsUrl.searchParams.set("fields", "id,permalink");
    mediaDetailsUrl.searchParams.set("access_token", accessToken);
    const details = await metaRequest(mediaDetailsUrl, { method: "GET" }).catch(
      () => ({ id: published.id }) as MetaResponse,
    );
    await updateInstagramPublication(input.ownerId, publicationId, {
      status: "PUBLISHED",
      providerContainerId: container.id,
      providerMediaId: published.id,
      permalink: details.permalink,
    });
    return {
      ...created.publication,
      status: "PUBLISHED" as const,
      permalink: details.permalink,
    };
  } catch (error) {
    await failInstagramPublication(
      input.ownerId,
      publicationId,
      "Instagram could not publish this Reel. Your approved video is safe—check the connection and try again.",
    );
    throw new InstagramPublishingError(
      "Instagram could not publish this Reel. Your approved video is safe—check the connection and try again.",
    );
  }
}
