"use client";

import { useEffect, useRef, useState } from "react";

type NarrationPreviewScene = {
  sceneId: string;
  title: string;
  narration: string;
  durationSeconds?: number;
  audioUrl: string;
};

export function NarrationPlayer({
  scenes,
}: {
  scenes: NarrationPreviewScene[];
}) {
  const sequencePlayer = useRef<HTMLAudioElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingSequence, setPlayingSequence] = useState(false);

  useEffect(() => {
    if (!playingSequence) return;
    void sequencePlayer.current?.play().catch(() => {
      setPlayingSequence(false);
    });
  }, [activeIndex, playingSequence]);

  function toggleSequence() {
    if (playingSequence) {
      sequencePlayer.current?.pause();
      setPlayingSequence(false);
      return;
    }
    if (activeIndex >= scenes.length) setActiveIndex(0);
    setPlayingSequence(true);
  }

  return (
    <section className="narration-player" aria-label="Narration audio preview">
      <header>
        <div>
          <span className="studio-eyebrow">AUDIO PREVIEW</span>
          <h2>Listen before video generation</h2>
          <p>
            Play the complete narration in order or review one scene at a time.
          </p>
        </div>
        <button type="button" onClick={toggleSequence}>
          <span aria-hidden="true">{playingSequence ? "Ⅱ" : "▶"}</span>
          {playingSequence ? "Pause full narration" : "Play full narration"}
        </button>
      </header>

      <audio
        ref={sequencePlayer}
        src={scenes[activeIndex]?.audioUrl}
        onEnded={() => {
          if (activeIndex < scenes.length - 1) {
            setActiveIndex((current) => current + 1);
          } else {
            setActiveIndex(0);
            setPlayingSequence(false);
          }
        }}
      />

      <div className="narration-scene-list">
        {scenes.map((scene, index) => (
          <article
            className={
              playingSequence && activeIndex === index ? "playing" : ""
            }
            key={scene.sceneId}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <header>
                <strong>{scene.title}</strong>
                <small>
                  {scene.durationSeconds
                    ? `${scene.durationSeconds.toFixed(1)}s audio`
                    : "Scene audio"}
                </small>
              </header>
              <p>{scene.narration}</p>
              <audio
                controls
                preload="metadata"
                src={scene.audioUrl}
                onPlay={() => {
                  sequencePlayer.current?.pause();
                  setPlayingSequence(false);
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
