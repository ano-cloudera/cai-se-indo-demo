import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "CLOUDERA Fraud AI Intelligence",
  description:
    "Fraud intelligence workspace for dashboard monitoring, investigations, assistant workflows, and model visibility in Cloudera AI.",
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
