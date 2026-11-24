"use client";

import { useState } from "react";

export function VideoPreviewPlayer({
  src,
  fallbackPoster,
  thumbnailTimeSeconds = 3,
}: {
  src: string;
  fallbackPoster: string;
  thumbnailTimeSeconds?: number;
}) {
  const [poster, setPoster] = useState(fallbackPoster);

  return (
    <div className="video-preview-player">
      <video controls preload="metadata" poster={poster} src={src}>
        Your browser does not support video playback.
      </video>
      <video
        aria-hidden="true"
        className="video-thumbnail-probe"
        muted
        playsInline
        preload="auto"
        src={src}
        tabIndex={-1}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          video.currentTime = Math.min(
            thumbnailTimeSeconds,
            Math.max(0, video.duration - 0.1),
          );
        }}
        onSeeked={(event) => {
          const video = event.currentTarget;
          if (!video.videoWidth || !video.videoHeight) return;
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext("2d");
          if (!context) return;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          setPoster(canvas.toDataURL("image/jpeg", 0.88));
        }}
      />
    </div>
  );
}
