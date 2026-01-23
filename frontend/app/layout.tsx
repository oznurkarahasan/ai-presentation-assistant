import type { Metadata } from "next";
import React, { Suspense } from "react";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

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
    <html lang="en" className={`dark ${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen relative font-sans" suppressHydrationWarning>
        <div className="bg-grid" />
        <main className="relative z-10">
          <Suspense fallback={<div />}>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}