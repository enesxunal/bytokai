import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
  gfm: true,
  breaks: false,
});

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "strong",
    "em",
    "del",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "figure",
    "figcaption",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
    th: ["align", "colspan", "rowspan"],
    td: ["align", "colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    }),
  },
};

export function htmlToSafeHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export function markdownToSafeHtml(md: string): string {
  const rawHtml = marked.parse(md, { async: false });

  if (typeof rawHtml !== "string") {
    throw new Error("Markdown dönüşümü beklenen string sonucu vermedi");
  }

  return htmlToSafeHtml(rawHtml);
}

/** Prefer sanitized content_html; fall back to markdown pipeline. */
export function resolveArticleBodyHtml(input: {
  content_html?: string | null;
  content_markdown?: string | null;
}): string {
  const html = input.content_html?.trim();
  if (html) return htmlToSafeHtml(html);

  const md = input.content_markdown?.trim();
  if (md) return markdownToSafeHtml(md);

  return "";
}
