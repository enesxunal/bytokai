/** XML metin / attribute escape (XSS ve bozuk XML önleme). */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function xmlResponse(
  body: string,
  options?: {
    contentType?: string;
    revalidateSeconds?: number;
  },
): Response {
  const revalidate = options?.revalidateSeconds ?? 300;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":
        options?.contentType ?? "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate * 2}`,
    },
  });
}
