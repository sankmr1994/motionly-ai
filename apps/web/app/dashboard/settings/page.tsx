import { isInstagramConfigured } from "@motionly/config";
import { getInstagramConnection } from "@motionly/db";
import {
  InstagramConnectButton,
  InstagramOAuthCompletion,
} from "../../../components/instagram-connect-button";
import { StudioShell } from "../../../components/studio-shell";
import { requireStudioSession } from "../../../lib/studio-session";

const messages: Record<string, { tone: string; title: string; copy: string }> =
  {
    connected: {
      tone: "success",
      title: "Instagram connected",
      copy: "Motionly can now prepare approved videos for this account.",
    },
    cancelled: {
      tone: "neutral",
      title: "Connection cancelled",
      copy: "Nothing changed. Connect whenever you are ready.",
    },
    "invalid-state": {
      tone: "danger",
      title: "Connection expired",
      copy: "For your security, start the Instagram connection again.",
    },
    failed: {
      tone: "danger",
      title: "Instagram did not connect",
      copy: "Your account is unchanged. Please try again.",
    },
    "not-configured": {
      tone: "danger",
      title: "Instagram setup is incomplete",
      copy: "The Meta application settings must be completed by an administrator.",
    },
  };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ instagram?: string; popup?: string }>;
}) {
  const { session } = await requireStudioSession();
  const connection = await getInstagramConnection(session.user.id);
  const configured = isInstagramConfigured();
  const { instagram, popup } = await searchParams;
  const notice = instagram ? messages[instagram] : undefined;

  return (
    <StudioShell
      active="settings"
      user={{ name: session.user.name, email: session.user.email }}
    >
      {popup === "1" && instagram ? (
        <InstagramOAuthCompletion result={instagram} />
      ) : null}
      <section className="settings-heading">
        <div>
          <span className="studio-eyebrow">ACCOUNT &amp; PUBLISHING</span>
          <h1>Settings</h1>
          <p>Connect the places where you want Motionly to publish.</p>
        </div>
      </section>

      {notice ? (
        <div className={`settings-notice ${notice.tone}`} role="status">
          <strong>{notice.title}</strong>
          <p>{notice.copy}</p>
        </div>
      ) : null}

      <section className="settings-section">
        <header>
          <div>
            <span className="studio-eyebrow">SOCIAL CONNECTIONS</span>
            <h2>Instagram</h2>
            <p>
              Connect one professional account now. Motionly never asks for or
              stores your Instagram password.
            </p>
          </div>
          <span className={`connection-badge ${connection ? "connected" : ""}`}>
            {connection ? "CONNECTED" : "NOT CONNECTED"}
          </span>
        </header>

        <div className="instagram-connection-card">
          <span className="instagram-mark" aria-hidden="true">
            ◎
          </span>
          <div className="instagram-connection-copy">
            {connection ? (
              <>
                <h3>
                  {connection.username
                    ? `@${connection.username}`
                    : (connection.displayName ?? "Instagram account")}
                </h3>
                <p>
                  Connected securely. Publishing will always require an approved
                  video in this first release.
                </p>
                <small>
                  Last verified{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(new Date(connection.lastVerifiedAt))}
                </small>
              </>
            ) : (
              <>
                <h3>Connect your Creator or Business account</h3>
                <p>
                  A Meta permission window opens once. After approval, you
                  return here automatically.
                </p>
              </>
            )}
          </div>
          {!connection && configured ? (
            <InstagramConnectButton />
          ) : !connection ? (
            <span className="instagram-setup-pending">
              Administrator setup required
            </span>
          ) : null}
        </div>

        <footer className="instagram-privacy-note">
          <span>✓</span>
          <p>
            Access is limited to the permissions approved in Meta. Connection
            tokens remain encrypted and are never shown in the browser.
          </p>
        </footer>
      </section>
    </StudioShell>
  );
}
