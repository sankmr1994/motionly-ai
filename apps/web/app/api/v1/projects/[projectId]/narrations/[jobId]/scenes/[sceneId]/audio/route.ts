import { getNarrationSceneAsset } from "@motionly/db";
import { parseSingleByteRange } from "@motionly/shared";
import { auth } from "../../../../../../../../../../lib/auth";
import { readNarrationAudio } from "../../../../../../../../../../lib/narration-storage";
import { isStoredAssetNotFound } from "../../../../../../../../../../lib/object-storage";

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
  context: {
    params: Promise<{ projectId: string; jobId: string; sceneId: string }>;
  },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.emailVerified) {
    return problem(401, "UNAUTHORIZED", "Sign in is required.");
  }
  const { projectId, jobId, sceneId } = await context.params;
  const asset = await getNarrationSceneAsset(
    session.user.id,
    projectId,
    jobId,
    sceneId,
  );
  if (!asset) return problem(404, "NOT_FOUND", "Audio was not found.");

  const range = request.headers.get("range");
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": asset.mimeType,
    "X-Content-Type-Options": "nosniff",
  };
  if (!range) {
    let audio: Buffer;
    try {
      audio = await readNarrationAudio(asset.assetKey);
    } catch (error) {
      return isStoredAssetNotFound(error)
        ? problem(404, "NOT_FOUND", "Audio was not found.")
        : problem(502, "STORAGE_UNAVAILABLE", "Audio storage is unavailable.");
    }
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Length": String(audio.byteLength),
      },
    });
  }

  const totalLength = asset.byteLength;
  if (!totalLength) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": "bytes */*" },
    });
  }
  const parsedRange = parseSingleByteRange(range, totalLength);
  if (!parsedRange) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${totalLength}` },
    });
  }
  const { start, end } = parsedRange;
  let chunk: Buffer;
  try {
    chunk = await readNarrationAudio(asset.assetKey, { start, end });
  } catch (error) {
    return isStoredAssetNotFound(error)
      ? problem(404, "NOT_FOUND", "Audio was not found.")
      : problem(502, "STORAGE_UNAVAILABLE", "Audio storage is unavailable.");
  }
  return new Response(new Uint8Array(chunk), {
    status: 206,
    headers: {
      ...commonHeaders,
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${start}-${end}/${totalLength}`,
    },
  });
}
