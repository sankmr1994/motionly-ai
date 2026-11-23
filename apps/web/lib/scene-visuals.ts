import {
  buildSceneArtworkPrompt,
  createSceneArtworkPromptHash,
  generateSceneArtwork,
  SCENE_ARTWORK_PROMPT_VERSION,
} from "@motionly/ai";
import { getGeminiImageConfig } from "@motionly/config";
import {
  getSceneVisualAsset,
  saveSceneVisualAsset,
  type VideoRenderInput,
} from "@motionly/db";
import { createSceneVisualAssetKey } from "@motionly/shared";
import {
  getPrivateObject,
  getPrivateObjectMetadata,
  putPrivateObject,
} from "./object-storage";

export type PreparedSceneVisual = {
  sceneId: string;
  image: Uint8Array;
  fileName: string;
};

async function prepareOneSceneVisual(
  ownerId: string,
  input: VideoRenderInput,
  scene: VideoRenderInput["storyboard"]["scenes"][number],
): Promise<PreparedSceneVisual> {
  const config = getGeminiImageConfig();
  const projectTopic =
    input.storyboard.project.topic ??
    input.storyboard.project.sourceScript?.slice(0, 700) ??
    input.projectTitle;
  const prompt = buildSceneArtworkPrompt({
    projectTitle: input.projectTitle,
    projectTopic,
    scene,
  });
  const promptHash = createSceneArtworkPromptHash({
    model: config.model,
    prompt,
  });
  const cached = await getSceneVisualAsset({
    ownerId,
    versionId: input.versionId,
    sceneId: scene.id,
    promptHash,
  });
  if (cached) {
    const metadata = await getPrivateObjectMetadata(cached.assetKey);
    if (metadata.exists && metadata.byteLength === cached.byteLength) {
      const extension = cached.mimeType === "image/png" ? "png" : "jpg";
      return {
        sceneId: scene.id,
        image: new Uint8Array(await getPrivateObject(cached.assetKey)),
        fileName: `${scene.id}_visual.${extension}`,
      };
    }
  }

  const generated = await generateSceneArtwork({
    projectTitle: input.projectTitle,
    projectTopic,
    scene,
  });
  const extension = generated.mimeType === "image/png" ? "png" : "jpg";
  const assetKey = createSceneVisualAssetKey({
    ownerId,
    projectId: input.projectId,
    projectTitle: input.projectTitle,
    revision: input.revision,
    versionId: input.versionId,
    sceneId: scene.id,
    promptHash: generated.promptHash,
    extension,
  });
  await putPrivateObject(assetKey, generated.image, generated.mimeType);
  await saveSceneVisualAsset({
    ownerId,
    projectId: input.projectId,
    versionId: input.versionId,
    revision: input.revision,
    sceneId: scene.id,
    promptHash: generated.promptHash,
    promptVersion: SCENE_ARTWORK_PROMPT_VERSION,
    model: generated.model,
    assetKey,
    mimeType: generated.mimeType,
    byteLength: generated.image.byteLength,
  });
  return {
    sceneId: scene.id,
    image: generated.image,
    fileName: `${scene.id}_visual.${extension}`,
  };
}

export async function prepareSceneVisuals(
  ownerId: string,
  input: VideoRenderInput,
  onProgress?: (completed: number, total: number) => Promise<void> | void,
) {
  const scenes = input.storyboard.scenes;
  const results = new Array<PreparedSceneVisual>(scenes.length);
  let nextIndex = 0;
  let completed = 0;
  const worker = async () => {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      const scene = scenes[index];
      if (!scene) return;
      results[index] = await prepareOneSceneVisual(ownerId, input, scene);
      completed += 1;
      await onProgress?.(completed, scenes.length);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(2, scenes.length) }, () => worker()),
  );
  return results;
}
