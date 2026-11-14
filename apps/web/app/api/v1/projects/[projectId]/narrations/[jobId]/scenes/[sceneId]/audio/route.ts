import { getNarrationSceneAsset } from "@motionly/db";
import { auth } from "../../../../../../../../../../lib/auth";
import { readNarrationAudio } from "../../../../../../../../../../lib/narration-storage";

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

  let audio: Buffer;
  try {
    audio = await readNarrationAudio(asset.assetKey);
  } catch {
    return problem(404, "NOT_FOUND", "Audio was not found.");
  }
  const range = request.headers.get("range");
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": asset.mimeType,
    "X-Content-Type-Options": "nosniff",
  };
  if (!range) {
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Length": String(audio.byteLength),
      },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${audio.byteLength}` },
    });
  }
  const start = match[1] ? Number(match[1]) : 0;
  const requestedEnd = match[2] ? Number(match[2]) : audio.byteLength - 1;
  const end = Math.min(requestedEnd, audio.byteLength - 1);
  if (!Number.isSafeInteger(start) || start < 0 || start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${audio.byteLength}` },
    });
  }
  const chunk = audio.subarray(start, end + 1);
  return new Response(new Uint8Array(chunk), {
    status: 206,
    headers: {
      ...commonHeaders,
      "Content-Length": String(chunk.byteLength),
      "Content-Range": `bytes ${start}-${end}/${audio.byteLength}`,
    },
  });
}
