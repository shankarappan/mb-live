import type { Metadata, Viewport } from "next";
import { Rajdhani, Source_Sans_3 } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MB Live",
  description:
    "Private band library — songs, charts, set lists, and music-stand reading mode.",
  applicationName: "MB Live",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "MB Live",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#050712",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      className={`${display.variable} ${body.variable} dark h-full`}
    >
      <body className="min-h-dvh min-w-0 font-sans">{children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
