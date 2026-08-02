import "server-only";

import { ImageResponse } from "next/og";

import { categoryCoverPalette } from "@/lib/covers/validate";

function truncate(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Başlık + kategoriye göre markalı PNG kapak üretir. */
export async function generateCoverPng(options: {
  title: string;
  categorySlug?: string | null;
  categoryName?: string | null;
}): Promise<Buffer> {
  const palette = categoryCoverPalette(options.categorySlug);
  const label = options.categoryName?.trim() || palette.label;
  const title = truncate(options.title || "BYTOK AI", 110);
  const titleSize = title.length > 70 ? 48 : 56;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 52%, ${palette.to} 100%)`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            opacity: 0.92,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#ffffff",
            }}
          />
          {`BYTOK AI · ${label}`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "92%",
            }}
          >
            {title}
          </div>
          <div
            style={{
              width: 96,
              height: 6,
              borderRadius: 999,
              background: "rgba(255,255,255,0.85)",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1600,
      height: 900,
    },
  );

  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}
