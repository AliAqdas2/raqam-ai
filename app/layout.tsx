import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import {
  Geist,
  Geist_Mono,
  Manrope,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Arabic,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// UI font — Noto Sans Arabic (variable). Crisp, dense-friendly, full Urdu coverage.
const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Reading font — Noto Nastaliq Urdu. Used for AI replies + the assistant greeting.
const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  variable: "--font-noto-nastaliq-urdu",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raqam-AI — Urdu AI Financial Literacy & Budgeting Platform",
  description:
    "A financially literate Pakistani friend who understands your finances, explains them in Urdu, helps you make better decisions, and safely performs a small set of useful actions on your behalf.",
};

// Warm-ledger palette for Clerk's own auth widgets. The detailed per-element
// styling lives on the <SignIn> / <SignUp> `appearance.elements` in the auth
// pages; these variables set the baseline so we no longer depend on @clerk/ui's
// `shadcn` theme (which dragged in the entire React-Native / Solana toolchain —
// see AUDIT.md §12.1).
const clerkAppearance = {
  variables: {
    colorPrimary: "#0F5132",
    colorText: "#14231B",
    colorTextSecondary: "#6B7A70",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FBF9F4",
    colorInputText: "#14231B",
    colorDanger: "#B3261E",
    colorSuccess: "#22B07D",
    borderRadius: "10px",
    // Tracks html[lang="ur"] token override in globals.css (Nastaliq in Urdu).
    fontFamily: "var(--font-sans)",
  },
} as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ur"
      dir="rtl"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} ${manrope.variable} ${notoNastaliqUrdu.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F4EC] text-[#14231B]">
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
