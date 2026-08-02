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
      { protocol: "http", hostname: "**.the-decoder.com" },
      { protocol: "http", hostname: "the-decoder.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "cdn.bytok.ai" },
      { protocol: "https", hostname: "api.dicebear.com" },
      // Allow common CMS CDNs used by RSS sources until covers are mirrored.
      { protocol: "https", hostname: "**.wp.com" },
      { protocol: "https", hostname: "i0.wp.com" },
      { protocol: "https", hostname: "i1.wp.com" },
      { protocol: "https", hostname: "i2.wp.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
