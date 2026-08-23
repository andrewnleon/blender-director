import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { preload } from "react-dom";
import { getStageHttpPreloadUrls } from "@/lib/stage-preload";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenClaw Yard",
  description:
    "A simple Next.js staging ground for placing Blender models — assets and testing for an OpenClaw RTS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  for (const modelUrl of getStageHttpPreloadUrls()) {
    preload(modelUrl, { as: "fetch" });
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
