"use client";

import { solarEclipseStoryboard } from "@motionly/shared";
import { MotionlyExplainer } from "@motionly/video";
import { Player } from "@remotion/player";

export default function Home() {
  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">G1 · VIDEO PIPELINE POC</p>
          <h1>Storyboard review before generation</h1>
          <p className="lede">
            The solar-eclipse fixture is validated, deterministic, and rendered
            from reusable React/SVG primitives. No external API is called on
            this page.
          </p>
        </div>
        <div className="status">
          <span /> Ready for local review
        </div>
      </header>

      <section className="workspace">
        <div className="preview-card">
          <div className="card-heading">
            <div>
              <small>PREVIEW</small>
              <h2>How does a solar eclipse happen?</h2>
            </div>
            <div className="metadata">30 sec · 720 × 1280 · 30 FPS</div>
          </div>
          <div className="player-shell">
            <Player
              component={MotionlyExplainer}
              inputProps={{ storyboard: solarEclipseStoryboard }}
              durationInFrames={900}
              compositionWidth={720}
              compositionHeight={1280}
              fps={30}
              controls
              loop
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>

        <aside className="scenes-card">
          <div className="card-heading">
            <div>
              <small>STORYBOARD</small>
              <h2>Five-scene timeline</h2>
            </div>
          </div>
          <ol>
            {solarEclipseStoryboard.scenes.map((scene, index) => (
              <li key={scene.id}>
                <span className="scene-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{scene.template.replaceAll("_", " ")}</strong>
                  <p>{scene.narration}</p>
                </div>
                <time>{scene.durationEstimateSeconds}s</time>
              </li>
            ))}
          </ol>
          <div className="guardrail">
            <strong>Safety boundary</strong>
            <p>
              Generated JSON is schema-validated and mapped only to predefined
              animation primitives. It is never executed as code.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
