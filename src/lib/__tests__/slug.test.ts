import { describe, it, expect } from "vitest";
import { wordToSlug } from "@/lib/slug";

describe("wordToSlug", () => {
  it("lowercases", () => {
    expect(wordToSlug("Serendipity")).toBe("serendipity");
  });

  it("replaces spaces with hyphens", () => {
    expect(wordToSlug("Well Being")).toBe("well-being");
  });

  it("strips apostrophes and non-alphanumerics", () => {
    expect(wordToSlug("don't")).toBe("don-t");
  });

  it("trims leading and trailing separators", () => {
    expect(wordToSlug("--serendipity--")).toBe("serendipity");
  });

  it("falls back to 'word' when empty", () => {
    expect(wordToSlug("!!!")).toBe("word");
  });
});
