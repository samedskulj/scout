import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { AuthProvider } from "@/auth/AuthProvider";
import { THEME_SCRIPT } from "@/ui/theme";
import "./globals.css";

/** Rating numerals only (see DESIGN.md, "The Condensed Is For Numbers Rule"). */
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

/** Satoshi (UI and body, variable 300–900) and Cabinet Grotesk (display headlines), from Fontshare. */
const FONTSHARE_CSS = "https://api.fontshare.com/v2/css?f[]=satoshi@1&f[]=cabinet-grotesk@500,700,800&display=swap";

export const metadata: Metadata = {
  title: { default: "Scout Copilot", template: "%s · Scout Copilot" },
  description:
    "Plain-English player scouting: the AI reads the brief, code ranks every player on the numbers, and every report claim is checked.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0e" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme class is set before paint by THEME_SCRIPT, so the server-rendered class differs on purpose.
    <html lang="en" className={`dark ${barlowCondensed.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTSHARE_CSS} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
