const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

export function slugifyTurkish(text: string): string {
  const replaced = text
    .trim()
    .split("")
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join("");

  return replaced
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function generateUniqueSlug(
  base: string,
  existsFn: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
  const root = slugifyTurkish(base) || "item";
  let candidate = root;
  let suffix = 2;

  while (await existsFn(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
