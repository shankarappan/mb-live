import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MB Live",
  description:
    "Private band library — songs, charts, set lists, and music-stand reading mode.",
  appleWebApp: {
    capable: true,
    title: "MB Live",
    statusBarStyle: "black-translucent",
  },
};

/**
 * Prefer Sydney for App Router segments. Project-level pin is also set in
 * vercel.json `"regions": ["syd1"]` (authoritative for Node.js serverless).
 */
export const preferredRegion = "syd1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
