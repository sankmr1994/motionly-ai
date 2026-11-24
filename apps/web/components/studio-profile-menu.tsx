"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "./sign-out-button";

export function StudioProfileMenu({
  user,
  isAdmin,
}: {
  user: { name: string; email: string };
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstInitial = user.name.trim().charAt(0).toUpperCase() || "M";

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="studio-profile-menu" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
        className="studio-profile-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="studio-avatar" aria-hidden="true">
          {firstInitial}
        </span>
      </button>
      {open ? (
        <div className="studio-profile-popover" role="menu">
          <div className="studio-profile-popover-user">
            <span className="studio-avatar" aria-hidden="true">
              {firstInitial}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          {isAdmin ? (
            <Link
              href="/admin/media"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Media admin
            </Link>
          ) : null}
          <SignOutButton className="studio-profile-menu-signout" />
        </div>
      ) : null}
    </div>
  );
}
