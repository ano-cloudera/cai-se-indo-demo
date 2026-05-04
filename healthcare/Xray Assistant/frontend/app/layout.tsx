import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Healthcare Demo — Xray Assist",
  description:
    "Chest X-ray upload and structured detection review experience built from the Ask the Data frontend template.",
  icons: {
    icon: "/pavicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
