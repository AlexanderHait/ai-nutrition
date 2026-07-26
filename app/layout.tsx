import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI-Nutrition",
    template: "%s · AI-Nutrition",
  },
  description: "Личный AI-диетолог: питание, КБЖУ, прогресс и поддержка.",
  applicationName: "AI-Nutrition",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "AI-Nutrition",
    description: "Личный AI-диетолог: питание, КБЖУ, прогресс и поддержка.",
    type: "website",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI-Nutrition",
    description: "Личный AI-диетолог: питание, КБЖУ, прогресс и поддержка.",
    images: ["/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090a0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
