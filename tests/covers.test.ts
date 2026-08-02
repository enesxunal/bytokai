import { describe, expect, it } from "vitest";

import {
  coverClassForCategory,
  isLikelyCoverImageUrl,
  needsCoverRepair,
  upgradeToHttps,
} from "@/lib/covers/validate";

describe("cover url validation", () => {
  it("rejects video and audio media", () => {
    expect(
      isLikelyCoverImageUrl(
        "http://the-decoder.com/wp-content/uploads/2026/08/opus_5_snowboard_demo.mp4",
      ),
    ).toBe(false);
    expect(isLikelyCoverImageUrl("https://cdn.example.com/clip.webm")).toBe(
      false,
    );
  });

  it("accepts common image extensions", () => {
    expect(
      isLikelyCoverImageUrl(
        "https://cdn.arstechnica.net/wp-content/uploads/2024/05/photo-1152x648.jpg",
      ),
    ).toBe(true);
    expect(isLikelyCoverImageUrl("https://images.unsplash.com/photo-1")).toBe(
      true,
    );
  });

  it("upgrades http to https", () => {
    expect(upgradeToHttps("http://example.com/a.jpg")).toBe(
      "https://example.com/a.jpg",
    );
  });

  it("maps category cover classes", () => {
    expect(coverClassForCategory("gelistirici")).toBe("bg-cover-yazilim");
    expect(coverClassForCategory(null)).toBe("bg-cover-default");
  });

  it("flags broken covers for repair", () => {
    expect(needsCoverRepair(null)).toBe(true);
    expect(needsCoverRepair("https://x.com/a.mp4")).toBe(true);
    expect(needsCoverRepair("https://x.com/a.jpg")).toBe(false);
  });
});
