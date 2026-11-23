import { solarEclipseStoryboard } from "@motionly/shared/fixtures/solar-eclipse";
import { Composition } from "remotion";
import {
  MotionlyExplainer,
  type MotionlyExplainerProps,
} from "./MotionlyExplainer";

export const RemotionRoot = () => (
  <Composition
    id="MotionlyExplainer"
    component={MotionlyExplainer}
    durationInFrames={900}
    fps={30}
    width={720}
    height={1280}
    defaultProps={{ storyboard: solarEclipseStoryboard }}
    calculateMetadata={({ props }: { props: MotionlyExplainerProps }) => ({
      durationInFrames: props.storyboard.scenes.reduce(
        (total: number, scene) =>
          total +
          Math.max(
            1,
            Math.ceil(
              (props.sceneDurationsSeconds?.[scene.id] ??
                scene.durationEstimateSeconds) * props.storyboard.video.fps,
            ),
          ),
        0,
      ),
    })}
  />
);
