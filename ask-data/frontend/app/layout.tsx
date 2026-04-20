import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Data Intelligence — Ask the Data",
  description: "Cloudera AI-powered analytics assistant. Ask questions about your data in natural language.",
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
