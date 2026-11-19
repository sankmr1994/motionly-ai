"use client";

import { useEffect, useState } from "react";
import { StudioIcon } from "./studio-icon";

const messageType = "motionly:instagram-oauth-complete";

export function InstagramConnectButton() {
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.data?.type !== messageType
      ) {
        return;
      }
      const result = String(event.data.result || "failed");
      window.location.assign(
        `/dashboard/settings?instagram=${encodeURIComponent(result)}`,
      );
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  return (
    <button
      className="studio-primary-button instagram-connect-button"
      disabled={opening}
      type="button"
      onClick={() => {
        const popup = window.open(
          "/api/v1/integrations/instagram/oauth/start",
          "motionly-instagram-connect",
          "popup=yes,width=620,height=760,resizable=yes,scrollbars=yes",
        );
        if (popup) {
          setOpening(true);
          popup.focus();
        } else {
          window.location.assign("/api/v1/integrations/instagram/oauth/start");
        }
      }}
    >
      <StudioIcon name="arrow" />
      {opening ? "Opening Meta…" : "Connect Instagram"}
    </button>
  );
}

export function InstagramOAuthCompletion({ result }: { result: string }) {
  useEffect(() => {
    if (!window.opener) return;
    window.opener.postMessage(
      { type: messageType, result },
      window.location.origin,
    );
    window.close();
  }, [result]);
  return null;
}
