import { getInstagramPublicationMedia } from "@motionly/db";
import { parseSingleByteRange } from "@motionly/shared";
import { isStoredAssetNotFound } from "../../../../../../../lib/object-storage";
import { readRenderedVideo } from "../../../../../../../lib/render-storage";

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
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const asset = await getInstagramPublicationMedia(token);
  if (!asset) {
    return problem(404, "NOT_FOUND", "Publication video was not found.");
  }

  const commonHeaders: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": asset.mimeType,
    "X-Content-Type-Options": "nosniff",
  };
  const range = request.headers.get("range");
  if (!range) {
    try {
      const video = await readRenderedVideo(asset.assetKey);
      return new Response(new Uint8Array(video), {
        status: 200,
        headers: {
          ...commonHeaders,
          "Content-Length": String(video.byteLength),
        },
      });
    } catch (error) {
      return isStoredAssetNotFound(error)
        ? problem(404, "NOT_FOUND", "Publication video was not found.")
        : problem(502, "STORAGE_UNAVAILABLE", "Video storage is unavailable.");
    }
  }

  const parsedRange = parseSingleByteRange(range, asset.byteLength);
  if (!parsedRange) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${asset.byteLength}` },
    });
  }
  const { start, end } = parsedRange;
  try {
    const chunk = await readRenderedVideo(asset.assetKey, { start, end });
    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${start}-${end}/${asset.byteLength}`,
      },
    });
  } catch (error) {
    return isStoredAssetNotFound(error)
      ? problem(404, "NOT_FOUND", "Publication video was not found.")
      : problem(502, "STORAGE_UNAVAILABLE", "Video storage is unavailable.");
  }
}
