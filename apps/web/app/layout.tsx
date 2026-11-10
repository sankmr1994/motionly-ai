import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Motionly AI POC",
  description:
    "Review deterministic educational video storyboards and animations.",
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
