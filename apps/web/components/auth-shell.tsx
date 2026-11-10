import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-nav">
          <Link className="auth-brand" href="/" aria-label="Motionly home">
            <span className="auth-brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            Motionly
          </Link>
          <Link className="auth-back-link" href="/">
            <span aria-hidden="true">←</span> Back to home
          </Link>
        </div>
        <span className="auth-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
        <section className="auth-journey" aria-label="How Motionly works">
          <header>
            <span>✣ &nbsp; FROM IDEA TO INSTAGRAM REEL</span>
            <small>3 simple steps</small>
          </header>
          <ol>
            <li>
              <span className="journey-icon">⌁</span>
              <p>
                <small>STEP 1</small>
                Type your idea: <strong>“How habits form”</strong>
              </p>
            </li>
            <li>
              <span className="journey-icon">✦</span>
              <p>
                <small>STEP 2</small>
                Motionly animates &amp; adds voiceover
              </p>
            </li>
            <li>
              <span className="journey-icon">▶</span>
              <p>
                <small>STEP 3</small>
                Download a 9:16 video ready to post
              </p>
            </li>
          </ol>
        </section>
        <div className="auth-trust">
          <span aria-hidden="true">▣</span>
          <p>
            <strong>Safe &amp; private. No video editing skills needed.</strong>
            Your projects stay private until you choose to share them.
          </p>
        </div>
        <p className="auth-legal">
          By continuing, you agree to Motionly&apos;s Terms of Service and
          Privacy Policy.
        </p>
      </section>
    </main>
  );
}
