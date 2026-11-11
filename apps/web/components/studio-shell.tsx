import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { StudioIcon } from "./studio-icon";

export function StudioShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const firstInitial = user.name.trim().charAt(0).toUpperCase() || "M";
  return (
    <div className="studio-layout">
      <aside className="studio-sidebar">
        <Link href="/dashboard" className="studio-logo">
          <span className="studio-logo-mark">
            <i />
            <i />
            <i />
          </span>
          <span>Motionly</span>
        </Link>

        <nav className="studio-navigation" aria-label="Studio navigation">
          <Link className="active" href="/dashboard">
            <StudioIcon name="video" />
            My Videos
          </Link>
          <Link href="/dashboard/create">
            <StudioIcon name="add" />
            Create video
            <small>NEW</small>
          </Link>
          <span aria-disabled="true" title="Coming in a later phase">
            <StudioIcon name="templates" />
            Templates
          </span>
          <span aria-disabled="true" title="Coming in a later phase">
            <StudioIcon name="examples" />
            Examples
          </span>
          <span aria-disabled="true" title="Coming in a later phase">
            <StudioIcon name="settings" />
            Settings
          </span>
        </nav>

        <div className="studio-sidebar-note">
          <strong>Video Creator</strong>
          <p>Turn ideas and concepts into clear visual explanations.</p>
        </div>

        <div className="studio-profile">
          <span className="studio-avatar">{firstInitial}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="studio-workspace">
        <header className="studio-topbar">
          <Link href="/dashboard" className="studio-mobile-logo">
            <span className="studio-logo-mark">
              <i />
              <i />
              <i />
            </span>
            Motionly
          </Link>
          <span>Motionly Studio</span>
          <div className="studio-topbar-actions">
            <Link href="/dashboard/create" aria-label="Create a video">
              <StudioIcon name="add" />
            </Link>
            <span className="studio-avatar" aria-hidden="true">
              {firstInitial}
            </span>
          </div>
        </header>
        <main className="studio-content">{children}</main>
      </div>

      <nav className="studio-mobile-nav" aria-label="Mobile navigation">
        <Link className="active" href="/dashboard">
          <StudioIcon name="home" />
          Videos
        </Link>
        <Link className="create" href="/dashboard/create">
          <StudioIcon name="add" />
          Create
        </Link>
        <span aria-disabled="true">
          <StudioIcon name="settings" />
          Settings
        </span>
      </nav>
    </div>
  );
}
