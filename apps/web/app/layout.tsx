import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Motionly — Ideas, taught in motion",
  description:
    "Turn any concept into a clear, narrated animated video—planned, voiced, captioned, and rendered in one creative workflow.",
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
