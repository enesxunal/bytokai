import { describe, expect, it } from "vitest";

import { resolveArticleShareImage } from "@/lib/seo/article-media";
import {
  buildNewsSitemapXml,
  filterNewsSitemapArticles,
  isValidPublishedAt,
  isWithinNewsWindow,
} from "@/lib/seo/news-sitemap";
import { buildRssXml, toRssPubDate } from "@/lib/seo/rss";
import {
  absolutePublicUrl,
  normalizePublicSiteUrl,
  resolvePublicSiteUrl,
} from "@/lib/seo/site-url";
import { escapeXml } from "@/lib/seo/xml";

describe("site url normalization", () => {
  it("maps aliases and preview hosts to www.bytokai.com", () => {
    expect(normalizePublicSiteUrl("https://bytok.ai")).toBe(
      "https://www.bytokai.com",
    );
    expect(normalizePublicSiteUrl("http://bytokai.com")).toBe(
      "https://www.bytokai.com",
    );
    expect(normalizePublicSiteUrl("https://bytokai.vercel.app")).toBe(
      "https://www.bytokai.com",
    );
    expect(normalizePublicSiteUrl("http://localhost:3000")).toBe(
      "https://www.bytokai.com",
    );
  });

  it("prefers NEXT_PUBLIC_SITE_URL when set", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.bytokai.com";
    expect(resolvePublicSiteUrl("https://bytok.ai")).toBe(
      "https://www.bytokai.com",
    );
    process.env.NEXT_PUBLIC_SITE_URL = prev;
  });

  it("builds absolute public paths", () => {
    expect(absolutePublicUrl("https://www.bytokai.com", "/haber/a")).toBe(
      "https://www.bytokai.com/haber/a",
    );
    expect(
      absolutePublicUrl(
        "https://www.bytokai.com",
        "https://cdn.example.com/x.jpg",
      ),
    ).toBe("https://cdn.example.com/x.jpg");
  });
});

describe("news sitemap", () => {
  const now = Date.parse("2026-08-02T12:00:00.000Z");

  it("keeps only published articles from last 48h with valid dates", () => {
    const filtered = filterNewsSitemapArticles(
      [
        {
          slug: "fresh",
          title: "Fresh",
          published_at: "2026-08-02T10:00:00.000Z",
        },
        {
          slug: "old",
          title: "Old",
          published_at: "2026-07-30T10:00:00.000Z",
        },
        {
          slug: "scheduled",
          title: "Future",
          published_at: "2026-08-03T10:00:00.000Z",
        },
        {
          slug: "bad",
          title: "Bad",
          published_at: null,
        },
        {
          slug: "empty-title",
          title: "  ",
          published_at: "2026-08-02T10:00:00.000Z",
        },
      ],
      now,
    );

    expect(filtered.map((a) => a.slug)).toEqual(["fresh"]);
    expect(isWithinNewsWindow("2026-08-02T10:00:00.000Z", now)).toBe(true);
    expect(isValidPublishedAt(null, now)).toBe(false);
  });

  it("builds escaped news sitemap xml", () => {
    const xml = buildNewsSitemapXml(
      "https://www.bytokai.com",
      [
        {
          slug: "a-b",
          title: 'Claude & "Opus" <5>',
          published_at: "2026-08-02T10:00:00.000Z",
        },
      ],
      now,
    );

    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain("<news:name>BYTOK AI</news:name>");
    expect(xml).toContain("<news:language>tr</news:language>");
    expect(xml).toContain(
      "https://www.bytokai.com/haber/a-b",
    );
    expect(xml).toContain("Claude &amp; &quot;Opus&quot; &lt;5&gt;");
    expect(xml).not.toContain("<news:title>Claude & \"Opus\"");
  });

  it("returns valid empty sitemap when no articles", () => {
    const xml = buildNewsSitemapXml("https://www.bytokai.com", [], now);
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});

describe("rss", () => {
  it("builds rss 2.0 with absolute urls and source", () => {
    const xml = buildRssXml({
      siteUrl: "https://www.bytokai.com",
      siteName: "BYTOK AI",
      siteDescription: "Haberler",
      articles: [
        {
          slug: "demo",
          title: "Başlık & test",
          excerpt: "Özet",
          published_at: "2026-08-02T10:00:00.000Z",
          authorName: "Selin Kara",
          categoryName: "Yapay Zekâ",
          sourceName: "The Decoder",
          sourceUrl: "https://the-decoder.com/example",
        },
        {
          slug: "no-date",
          title: "Skip",
          excerpt: null,
          published_at: null,
        },
      ],
    });

    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain("<guid isPermaLink=\"true\">https://www.bytokai.com/haber/demo</guid>");
    expect(xml).toContain("<author>Selin Kara</author>");
    expect(xml).toContain("<category>Yapay Zekâ</category>");
    expect(xml).toContain(
      '<source url="https://the-decoder.com/example">The Decoder</source>',
    );
    expect(xml).toContain("Başlık &amp; test");
    expect(xml).not.toContain("/haber/no-date");
    expect(toRssPubDate("2026-08-02T10:00:00.000Z")).toContain("2026");
  });
});

describe("share image", () => {
  it("prefers cover, then default, then brand mark", () => {
    expect(
      resolveArticleShareImage(
        "https://www.bytokai.com",
        "https://cdn.example.com/cover.jpg",
        "/og-default.png",
      ),
    ).toBe("https://cdn.example.com/cover.jpg");

    expect(
      resolveArticleShareImage(
        "https://www.bytokai.com",
        null,
        "/bytok-ai.png",
      ),
    ).toBe("https://www.bytokai.com/bytok-ai.png");

    expect(
      resolveArticleShareImage(
        "https://www.bytokai.com",
        null,
        "/favicon.ico",
      ),
    ).toBe("https://www.bytokai.com/bytok-ai.png");

    expect(
      resolveArticleShareImage(
        "https://www.bytokai.com",
        "https://cdn.example.com/clip.mp4",
        null,
      ),
    ).toBe("https://www.bytokai.com/bytok-ai.png");
  });
});

describe("xml escape", () => {
  it("escapes reserved characters", () => {
    expect(escapeXml(`A&B<"'>`)).toBe("A&amp;B&lt;&quot;&apos;&gt;");
  });
});
