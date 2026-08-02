import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleDetail } from "@/components/articles/article-detail";
import { loadArticlePage } from "@/lib/articles/load-article-page";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function absoluteUrl(base: string, path: string): string {
  const root = base.replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${root}${path.startsWith("/") ? path : `/${path}`}`;
}

function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadArticlePage(slug);

  if (!data) {
    return {
      title: "Haber bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const { article, settings, canonicalUrl } = data;
  const title = article.seo_title?.trim() || article.title;
  const description =
    article.seo_description?.trim() ||
    article.excerpt?.trim() ||
    settings.site_description;
  const ogImage = absoluteUrl(
    settings.site_url,
    article.cover_image_url || settings.default_og_image,
  );

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      url: canonicalUrl,
      title,
      description,
      siteName: settings.site_name,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      authors: article.author ? [article.author.name] : undefined,
      section: article.category?.name,
      tags: article.tags.map((t) => t.name),
      images: [
        {
          url: ogImage,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await loadArticlePage(slug);

  if (!data) {
    notFound();
  }

  const { article, settings, canonicalUrl } = data;
  const siteUrl = settings.site_url.replace(/\/$/, "");
  const ogImage = absoluteUrl(
    settings.site_url,
    article.cover_image_url || settings.default_og_image,
  );

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt || settings.site_description,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    image: [ogImage],
    author: article.author
      ? {
          "@type": "Person",
          name: article.author.name,
          url: `${siteUrl}/yazar/${article.author.slug}`,
        }
      : {
          "@type": "Organization",
          name: settings.site_name,
        },
    publisher: {
      "@type": "Organization",
      name: settings.site_name,
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(settings.site_url, "/bytok-ai.png"),
      },
    },
    articleSection: article.category?.name,
    keywords: article.tags.map((t) => t.name).join(", ") || undefined,
    isAccessibleForFree: true,
  };

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Ana sayfa",
      item: siteUrl,
    },
  ];

  if (article.category) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: article.category.name,
      item: `${siteUrl}/kategori/${article.category.slug}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: article.title,
      item: canonicalUrl,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: article.title,
      item: canonicalUrl,
    });
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      <ArticleDetail data={data} />
    </>
  );
}
