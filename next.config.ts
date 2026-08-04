import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Современные форматы весят заметно меньше JPEG на тех же фото еды.
    formats: ["image/avif", "image/webp"],
    // Аватарки приходят из Telegram напрямую или через наш прокси /api/avatar.
    remotePatterns: [
      { protocol: "https", hostname: "api.telegram.org" },
      { protocol: "https", hostname: "**.telesco.pe" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
    minimumCacheTTL: 86400,
  },
  async redirects() {
    return [
      {
        source: "/client/coach",
        destination: "/client/coach-v3",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      {
        source: "/client/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
      {
        // Аватарки меняются редко — пусть браузер и CDN держат их у себя.
        source: "/api/avatar/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
