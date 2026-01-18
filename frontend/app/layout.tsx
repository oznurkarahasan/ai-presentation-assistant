import type { Metadata } from "next";
import React, { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PreCue.ai | Master the Preparation, Control the Cue",
  description: "Next Gen Presentation Tool - Master your preparation and control the cue with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen relative" suppressHydrationWarning>
        <div className="bg-grid" />
        <main className="relative z-10">
          <Suspense fallback={<div />}>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}