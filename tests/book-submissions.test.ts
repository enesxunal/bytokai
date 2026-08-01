import { describe, expect, it, afterEach } from "vitest";

import {
  bookSubmissionFieldsSchema,
  isAllowedUpload,
  resolveMimeType,
  sanitizePlainText,
  MAX_FILE_BYTES,
} from "@/lib/book-submissions/schema";
import {
  checkMemoryRateLimit,
  resetMemoryRateLimit,
  hashIp,
  buildStoragePath,
} from "@/lib/book-submissions/security";
import { maskSmtpUser } from "@/lib/mail/smtp-config";

describe("book submission schema", () => {
  afterEach(() => {
    resetMemoryRateLimit();
  });

  it("geçerli alanları kabul eder", () => {
    const parsed = bookSubmissionFieldsSchema.safeParse({
      fullName: "Ayşe Yılmaz",
      email: "ayse@example.com",
      phone: "",
      bookTitle: "Dijital Ufuk",
      bookGenre: "Teknoloji",
      estimatedWordCount: "45000",
      manuscriptStatus: "Tamamlandı",
      synopsis: "a".repeat(60),
      authorBio: "b".repeat(40),
      consent: "on",
      website: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("ayse@example.com");
      expect(parsed.data.estimatedWordCount).toBe(45000);
      expect(parsed.data.phone).toBeNull();
    }
  });

  it("eksik alanları reddeder", () => {
    const parsed = bookSubmissionFieldsSchema.safeParse({
      fullName: "A",
      email: "bad",
      bookTitle: "",
      bookGenre: "Roman",
      manuscriptStatus: "Tamamlandı",
      synopsis: "kısa",
      authorBio: "kısa",
      consent: "on",
      website: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("geçersiz e-postayı reddeder", () => {
    const parsed = bookSubmissionFieldsSchema.safeParse({
      fullName: "Ayşe Yılmaz",
      email: "not-an-email",
      bookTitle: "Kitap",
      bookGenre: "Roman",
      manuscriptStatus: "Tamamlandı",
      synopsis: "a".repeat(60),
      authorBio: "b".repeat(40),
      consent: "on",
      website: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("honeypot doluysa reddeder", () => {
    const parsed = bookSubmissionFieldsSchema.safeParse({
      fullName: "Ayşe Yılmaz",
      email: "ayse@example.com",
      bookTitle: "Kitap",
      bookGenre: "Roman",
      manuscriptStatus: "Tamamlandı",
      synopsis: "a".repeat(60),
      authorBio: "b".repeat(40),
      consent: "on",
      website: "http://spam.test",
    });
    expect(parsed.success).toBe(false);
  });

  it("HTML içeriğini temizler", () => {
    expect(sanitizePlainText("<script>alert(1)</script>Merhaba")).toContain(
      "Merhaba",
    );
    expect(sanitizePlainText("<script>alert(1)</script>Merhaba")).not.toContain(
      "<script>",
    );
  });
});

describe("file validation", () => {
  it("büyük dosyayı reddeder", () => {
    const result = isAllowedUpload({
      name: "kitap.pdf",
      type: "application/pdf",
      size: MAX_FILE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
  });

  it("yanlış dosya tipini reddeder", () => {
    const result = isAllowedUpload({
      name: "malware.exe",
      type: "application/octet-stream",
      size: 1000,
    });
    expect(result.ok).toBe(false);
  });

  it("geçerli PDF kabul eder", () => {
    const result = isAllowedUpload({
      name: "kitap.pdf",
      type: "application/pdf",
      size: 1024,
    });
    expect(result.ok).toBe(true);
    expect(resolveMimeType({ name: "kitap.docx", type: "" })).toContain(
      "wordprocessingml",
    );
  });
});

describe("rate limit", () => {
  afterEach(() => {
    resetMemoryRateLimit();
  });

  it("kısa sürede çoklu gönderimi engeller", () => {
    expect(checkMemoryRateLimit("ip:test", 3)).toBe(true);
    expect(checkMemoryRateLimit("ip:test", 3)).toBe(true);
    expect(checkMemoryRateLimit("ip:test", 3)).toBe(true);
    expect(checkMemoryRateLimit("ip:test", 3)).toBe(false);
  });

  it("ip hash üretir ve dosya yolu güvenlidir", () => {
    const hash = hashIp("1.2.3.4");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("1.2.3.4");
    const path = buildStoragePath("Benim Kitabım.PDF");
    expect(path.endsWith(".pdf")).toBe(true);
    expect(path).not.toContain(" ");
  });
});

describe("smtp helpers", () => {
  it("SMTP kullanıcıyı maskeler", () => {
    expect(maskSmtpUser("mailer@bytokai.com")).toBe("m***@bytokai.com");
  });
});
