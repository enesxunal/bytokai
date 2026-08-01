import type { Author } from "@/types";

export const PROMPT_VERSION = "v1.0.0";

export const EDITORIAL_RULES = `
BYTOK AI editoryal kuralları:
1. Türkçe yaz. Dil doğal, net ve profesyonel olsun.
2. Kaynak makalenin çevirisini veya yakın kopyasını üretme; özgün anlatım kur.
3. Kaynakta bulunmayan bilgi, sayı, alıntı veya iddia uydurma.
4. Doğrudan uzun alıntı yapma.
5. Kaynak başlığını birebir çevirme; yeni, merak uyandırıcı ama clickbait olmayan bir başlık yaz.
6. Şirket açıklaması ile bağımsız bulguyu ayır.
7. Tahminleri gerçek gibi sunma; belirsizliği belirt.
8. Markdown gövdede H1 kullanma; başlık ayrı alandadır.
9. Gövdeyi okunabilir H2/H3 alt başlıklarla böl.
10. Kişi, ürün, model, şirket ve kurum adlarını bozma.
11. Reklam veya sponsorlu içerik izlenimi verme.
12. Gereksiz ünlem ve sansasyonel dil kullanma.
13. Yalnızca istenen JSON çıktısını döndür.
`.trim();

export interface SourcePackage {
  sourceName: string;
  originalUrl: string;
  originalTitle: string;
  originalExcerpt: string | null;
  limitedContent: string | null;
  publishedAt: string | null;
  authorName: string | null;
  metadata?: Record<string, unknown>;
  selectedAuthorSlug: string;
  categorySlugs: string[];
  personaSummaries: Array<{
    slug: string;
    name: string;
    role: string;
    expertise: string[];
  }>;
}

export function buildSystemPrompt(author: Pick<
  Author,
  "name" | "slug" | "role" | "tone" | "writing_rules" | "system_prompt" | "expertise"
>): string {
  return [
    "Sen BYTOK AI dijital yayınında çalışan bir editoryal yazarsın.",
    `Persona: ${author.name} (${author.slug})`,
    `Rol: ${author.role}`,
    `Ton: ${author.tone}`,
    `Uzmanlık: ${author.expertise.join(", ")}`,
    "",
    "Persona system prompt:",
    author.system_prompt,
    "",
    "Yazım kuralları:",
    author.writing_rules,
    "",
    EDITORIAL_RULES,
    "",
    "Haberi bu personasının sesiyle yaz; ancak haberin gerçeklerini persona uğruna değiştirme.",
    "Kaynak belirsizse bunu açıkça belirt.",
    "Sonuç bölümünde gereksiz tekrar yapma.",
  ].join("\n");
}

export function buildGenerationPrompt(sourcePackage: SourcePackage): string {
  return [
    "Aşağıdaki kaynak paketinden BYTOK AI için özgün Türkçe bir haber üret.",
    "Tam makale kopyalama. Yalnızca verilen başlık, özet, sınırlı içerik ve metadata üzerinden yaz.",
    "",
    `Seçilen yazar personası: ${sourcePackage.selectedAuthorSlug}`,
    `İzin verilen kategoriler: ${sourcePackage.categorySlugs.join(", ")}`,
    "",
    "Kaynak paketi:",
    JSON.stringify(
      {
        sourceName: sourcePackage.sourceName,
        originalUrl: sourcePackage.originalUrl,
        originalTitle: sourcePackage.originalTitle,
        originalExcerpt: sourcePackage.originalExcerpt,
        limitedContent: sourcePackage.limitedContent,
        publishedAt: sourcePackage.publishedAt,
        authorName: sourcePackage.authorName,
        metadata: sourcePackage.metadata ?? {},
        personas: sourcePackage.personaSummaries,
      },
      null,
      2,
    ),
    "",
    "Çıktı alanları: title, slugSuggestion, excerpt, contentMarkdown, categorySlug, tags,",
    "authorPersonaSlug, seoTitle, seoDescription, keyFacts[{claim, supportedBySource}],",
    "confidenceScore (0-1), riskFlags[], suggestedPublishPriority (1-10).",
    "authorPersonaSlug değeri seçilen personası ile aynı olmalı.",
    "confidenceScore kaynak yeterliliğini yansıtsın. Yetersiz kaynakta düşük skor ver.",
  ].join("\n");
}

export function buildClassifyPrompt(input: {
  title: string;
  excerpt: string | null;
  limitedContent: string | null;
  sourceName: string;
  url: string;
  categorySlugs: string[];
}): string {
  return [
    "Bu içeriğin BYTOK AI yapay zekâ haber platformuna uygun olup olmadığını değerlendir.",
    "Uygun içerikler: yapay zekâ, makine öğrenmesi, geliştirici araçları, AI ürünleri,",
    "araştırma, regülasyon, robotik, AI iş dünyası ve sektörel analiz.",
    "Uygun olmayanlar: alakasız spor/eğlence, reklam, yalnızca basın bülteni tekrarı,",
    "kaynak yetersizliği, spam veya AI ile ilgisi zayıf genel teknoloji.",
    "",
    `Kaynak: ${input.sourceName}`,
    `URL: ${input.url}`,
    `Başlık: ${input.title}`,
    `Özet: ${input.excerpt ?? ""}`,
    `Sınırlı içerik: ${input.limitedContent ?? ""}`,
    `Kategori adayları: ${input.categorySlugs.join(", ")}`,
    "",
    "JSON döndür: suitable, reason, categoryHint, technicalDepth, businessFocus,",
    "researchFocus, criticalFocus, trendFocus. Skorlar 0-1 arasında olsun.",
  ].join("\n");
}
