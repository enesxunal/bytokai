import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.techcrunch.com" },
      { protocol: "https", hostname: "techcrunch.com" },
      { protocol: "https", hostname: "**.venturebeat.com" },
      { protocol: "https", hostname: "venturebeat.com" },
      { protocol: "https", hostname: "**.technologyreview.com" },
      { protocol: "https", hostname: "www.technologyreview.com" },
      { protocol: "https", hostname: "**.arstechnica.com" },
      { protocol: "https", hostname: "cdn.arstechnica.net" },
      { protocol: "https", hostname: "**.the-decoder.com" },
      { protocol: "https", hostname: "the-decoder.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
