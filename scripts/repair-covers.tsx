/**
 * One-off / ops: repair published articles with missing or video cover URLs.
 * Usage: npx tsx scripts/repair-covers.tsx
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import * as cheerio from "cheerio";
import { ImageResponse } from "next/og";

function loadEnv() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]] && v) process.env[m[1]] = v;
    }
  } catch {
    // Optional when env is injected by `vercel env run`
  }
}

function isLikelyCoverImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const path = parsed.pathname;
    if (/\.(mp4|webm|mov|m4v|avi|mkv|m3u8|mpg|mpeg)(?:[?#]|$)/i.test(path)) {
      return false;
    }
    if (/\.(mp3|wav|aac|ogg|flac|m4a)(?:[?#]|$)/i.test(path)) return false;
    if (/\.(jpe?g|png|gif|webp|avif)(?:[?#]|$)/i.test(path)) return true;
    if (/\.(html?|php|aspx?|jsx?|tsx?|json|xml|pdf|zip)(?:[?#]|$)/i.test(path)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function needsCoverRepair(url: string | null | undefined): boolean {
  return !url?.trim() || !isLikelyCoverImageUrl(url);
}

function upgradeToHttps(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return url;
  }
}

function palette(slug?: string | null) {
  switch (slug) {
    case "yapay-zeka":
      return { from: "#0b1f4a", via: "#1565ef", to: "#22d3ee", label: "Yapay Zekâ" };
    case "gelistirici":
      return { from: "#07111f", via: "#1e3a8a", to: "#38bdf8", label: "Geliştirici" };
    case "is-dunyasi":
      return { from: "#0c1a2e", via: "#0e7490", to: "#22d3ee", label: "İş Dünyası" };
    case "arastirma":
      return { from: "#0f172a", via: "#0369a1", to: "#67e8f9", label: "Araştırma" };
    case "yorum":
      return { from: "#0b1220", via: "#1d4ed8", to: "#60a5fa", label: "Yorum" };
    default:
      return { from: "#07111f", via: "#1565ef", to: "#22d3ee", label: "BYTOK AI" };
  }
}

async function scrapeOg(pageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pageUrl, {
      headers: { Accept: "text/html", "User-Agent": "BYTOK-AI-CoverBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);
    const raw =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;
    if (!raw) return null;
    const absolute = new URL(raw, pageUrl).toString();
    return isLikelyCoverImageUrl(absolute) ? upgradeToHttps(absolute) : null;
  } catch {
    return null;
  }
}

async function probe(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    if (!response.ok) return false;
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type.startsWith("image/")) return true;
    if (type.startsWith("video/") || type.startsWith("audio/")) return false;
    return /\.(jpe?g|png|gif|webp|avif)(?:[?#]|$)/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

async function accept(url: string): Promise<string | null> {
  if (!isLikelyCoverImageUrl(url)) return null;
  const httpsUrl = upgradeToHttps(url);
  if (await probe(httpsUrl)) return httpsUrl;
  if (httpsUrl !== url && (await probe(url))) return url;
  return null;
}

async function generatePng(
  title: string,
  categorySlug?: string | null,
  categoryName?: string | null,
): Promise<Buffer> {
  const p = palette(categorySlug);
  const label = categoryName || p.label;
  const text = title.trim().replace(/\s+/g, " ").slice(0, 110);
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
          background: `linear-gradient(135deg, ${p.from} 0%, ${p.via} 52%, ${p.to} 100%)`,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600 }}>
          {`BYTOK AI · ${label}`}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: text.length > 70 ? 48 : 56,
            fontWeight: 700,
            maxWidth: "92%",
          }}
        >
          {text}
        </div>
      </div>
    ),
    { width: 1600, height: 900 },
  );
  return Buffer.from(await response.arrayBuffer());
}

loadEnv();

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: rows, error } = await supabase
    .from("articles")
    .select(
      "id, title, cover_image_url, source_url, category:categories(slug, name)",
    )
    .in("status", ["published", "scheduled", "needs_review"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  let fixed = 0;
  let checked = 0;

  for (const row of rows ?? []) {
    if (!needsCoverRepair(row.cover_image_url)) continue;
    checked += 1;
    console.log(
      "repair",
      row.id,
      String(row.cover_image_url ?? "null").slice(0, 90),
    );

    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    let url: string | null = null;
    let source = "none";

    if (row.cover_image_url) {
      url = await accept(row.cover_image_url);
      if (url) source = "original";
    }
    if (!url && row.source_url) {
      const og = await scrapeOg(row.source_url);
      if (og) {
        url = await accept(og);
        if (url) source = "og";
      }
    }
    if (!url) {
      try {
        const png = await generatePng(row.title, category?.slug, category?.name);
        const now = new Date();
        const path = `covers/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.png`;
        const { error: upErr } = await supabase.storage
          .from("article-covers")
          .upload(path, png, {
            contentType: "image/png",
            upsert: false,
            cacheControl: "31536000",
          });
        if (!upErr) {
          url = supabase.storage.from("article-covers").getPublicUrl(path).data
            .publicUrl;
          source = "generated";
        } else {
          console.error("upload", upErr.message);
        }
      } catch (e) {
        console.error("generate", e instanceof Error ? e.message : e);
      }
    }

    console.log(" ->", source, String(url ?? "").slice(0, 120));
    if (!url || url === row.cover_image_url) continue;

    const { error: updateError } = await supabase
      .from("articles")
      .update({ cover_image_url: url })
      .eq("id", row.id);
    if (updateError) {
      console.error("update", updateError.message);
      continue;
    }
    fixed += 1;
  }

  console.log(JSON.stringify({ checked, fixed, scanned: rows?.length ?? 0 }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
