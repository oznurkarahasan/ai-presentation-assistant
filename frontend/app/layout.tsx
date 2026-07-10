import type { Metadata } from "next";
import React, { Suspense } from "react";
import { Inter, Outfit } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`dark ${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen relative font-sans" suppressHydrationWarning>
        <div className="bg-grid" />
        <NextIntlClientProvider messages={messages} locale={locale}>
          <main className="relative z-10">
            <Suspense fallback={<div />}>{children}</Suspense>
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
