import { getRenderedVideoAsset } from "@motionly/db";
import { parseSingleByteRange } from "@motionly/shared";
import { auth } from "../../../../../../../../lib/auth";
import { isStoredAssetNotFound } from "../../../../../../../../lib/object-storage";
import { readRenderedVideo } from "../../../../../../../../lib/render-storage";

export const runtime = "nodejs";

function problem(status: number, code: string, detail: string) {
  return Response.json(
    {
      type: `https://motionly.ai/problems/${code.toLowerCase().replaceAll("_", "-")}`,
      title: detail,
      status,
      code,
      detail,
    },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; jobId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.emailVerified) {
    return problem(401, "UNAUTHORIZED", "Sign in is required.");
  }
  const { projectId, jobId } = await context.params;
  const asset = await getRenderedVideoAsset(session.user.id, projectId, jobId);
  if (!asset) return problem(404, "NOT_FOUND", "Video was not found.");
  const download = new URL(request.url).searchParams.get("download") === "1";
  if (download && asset.reviewStatus !== "APPROVED") {
    return problem(
      403,
      "VIDEO_NOT_APPROVED",
      "Approve the finished video before downloading it.",
    );
  }

  const range = request.headers.get("range");
  const commonHeaders: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": asset.mimeType,
    "X-Content-Type-Options": "nosniff",
  };
  if (download) {
    commonHeaders["Content-Disposition"] =
      `attachment; filename="motionly-${projectId}.mp4"`;
  }
  if (!range) {
    let video: Buffer;
    try {
      video = await readRenderedVideo(asset.assetKey);
    } catch (error) {
      return isStoredAssetNotFound(error)
        ? problem(404, "NOT_FOUND", "Video was not found.")
        : problem(502, "STORAGE_UNAVAILABLE", "Video storage is unavailable.");
    }
    return new Response(new Uint8Array(video), {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Length": String(video.byteLength),
      },
    });
  }
  const parsedRange = parseSingleByteRange(range, asset.byteLength);
  if (!parsedRange) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${asset.byteLength}` },
    });
  }
  const { start, end } = parsedRange;
  let chunk: Buffer;
  try {
    chunk = await readRenderedVideo(asset.assetKey, { start, end });
  } catch (error) {
    return isStoredAssetNotFound(error)
      ? problem(404, "NOT_FOUND", "Video was not found.")
      : problem(502, "STORAGE_UNAVAILABLE", "Video storage is unavailable.");
  }
  return new Response(new Uint8Array(chunk), {
    status: 206,
    headers: {
      ...commonHeaders,
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${start}-${end}/${asset.byteLength}`,
    },
  });
}
