import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { AccountNav } from "@/components/AccountNav";
import { BackToTop } from "@/components/BackToTop";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "amzn.clone",
  description: "An Amazon-style demo store",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body id="top" className="flex min-h-full flex-col bg-page text-gray-900">
        <a href="#main" className="sr-only z-50 bg-white p-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2">
          Skip to content
        </a>
        {/* Header reads search params, which requires a Suspense boundary. */}
        <Suspense fallback={<div className="h-[104px] bg-navy" />}>
          <Header account={<AccountNav />} />
        </Suspense>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-4 has-[>.home-full]:max-w-none lg:has-[>.home-full]:px-6">
          {children}
        </main>
        <Footer />
        <BackToTop />
      </body>
    </html>
  );
}
