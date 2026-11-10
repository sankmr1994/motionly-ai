import { solarEclipseStoryboard, storyboardSchema } from "@motionly/shared";
import { Composition } from "remotion";
import { z } from "zod";
import {
  MotionlyExplainer,
  type MotionlyExplainerProps,
} from "./MotionlyExplainer";

const motionlyExplainerPropsSchema = z.object({
  storyboard: storyboardSchema,
  audioFile: z.string().optional(),
  audioPlaybackRate: z.number().positive().max(2).optional(),
  captions: z
    .array(
      z.object({
        sceneId: z.string(),
        startFrame: z.number().int().nonnegative(),
        endFrame: z.number().int().positive(),
        text: z.string().min(1),
      }),
    )
    .optional(),
});

export const RemotionRoot = () => (
  <Composition<typeof motionlyExplainerPropsSchema, MotionlyExplainerProps>
    id="MotionlyExplainer"
    component={MotionlyExplainer}
    durationInFrames={900}
    fps={30}
    width={720}
    height={1280}
    schema={motionlyExplainerPropsSchema}
    defaultProps={{ storyboard: solarEclipseStoryboard }}
  />
);
