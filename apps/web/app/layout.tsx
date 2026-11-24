import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Motionly — Ideas, taught in motion",
  description:
    "Turn any concept into a clear, narrated animated video—planned, voiced, captioned, and rendered in one creative workflow.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
