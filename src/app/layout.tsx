import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { StoreHydrator } from "@/components/StoreHydrator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "amzn.clone",
  description: "A 24-hour Amazon clone take-home",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-gray-100 text-gray-900">
        <StoreHydrator />
        {/* Header reads search params, which requires a Suspense boundary. */}
        <Suspense fallback={<div className="h-14 bg-slate-900" />}>
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
