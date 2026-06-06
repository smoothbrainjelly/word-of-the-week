import { describe, it, expect } from "vitest";
import { renderMarkdownTemplate, renderHtmlTemplate } from "@/lib/email-template";
import type { WordData } from "@/lib/email-template";

const sampleWord: WordData = {
  word: "Serendipity",
  pronunciation: "/ˌserənˈdɪpɪti/",
  simple_pronunciation: "ser-uhn-DIP-uh-tee",
  definition: "The occurrence of events by chance in a happy or beneficial way.",
  etymology: "Coined by Horace Walpole from the Persian fairy tale 'The Three Princes of Serendip'.",
  example: "Finding that rare book at the flea market was pure serendipity.",
};

describe("renderMarkdownTemplate", () => {
  it("includes all word fields", () => {
    const result = renderMarkdownTemplate(sampleWord);
    expect(result).toContain(sampleWord.word);
    expect(result).toContain(sampleWord.pronunciation);
    expect(result).toContain(sampleWord.simple_pronunciation);
    expect(result).toContain(sampleWord.definition);
    expect(result).toContain(sampleWord.etymology);
    expect(result).toContain(sampleWord.example);
  });

  it("includes header", () => {
    const result = renderMarkdownTemplate(sampleWord);
    expect(result).toContain("# Word of the Week");
  });

  it("includes section headings", () => {
    const result = renderMarkdownTemplate(sampleWord);
    expect(result).toContain("### Definition");
    expect(result).toContain("### Etymology");
    expect(result).toContain("### Example");
  });

  it("formats example as blockquote", () => {
    const result = renderMarkdownTemplate(sampleWord);
    expect(result).toContain("> " + sampleWord.example);
  });

  it("includes unsubscribe link when url is provided", () => {
    const result = renderMarkdownTemplate(sampleWord, "https://example.com/unsubscribe");
    expect(result).toContain("[Unsubscribe](https://example.com/unsubscribe)");
  });

  it("omits unsubscribe link when url is not provided", () => {
    const result = renderMarkdownTemplate(sampleWord);
    expect(result).not.toContain("Unsubscribe");
  });

  it("separates pronunciation with em dash", () => {
    const result = renderMarkdownTemplate(sampleWord);
    expect(result).toContain(`${sampleWord.pronunciation} — ${sampleWord.simple_pronunciation}`);
  });

  it("produces expected markdown structure", () => {
    const result = renderMarkdownTemplate(sampleWord);
    const lines = result.split("\n");
    expect(lines[0]).toBe("# Word of the Week");
    expect(lines[2]).toBe(`# ${sampleWord.word}`);
    expect(lines[4]).toBe(`${sampleWord.pronunciation} — ${sampleWord.simple_pronunciation}`);
    expect(lines[6]).toBe("---");
    expect(lines[8]).toBe("### Definition");
  });
});

describe("renderHtmlTemplate", () => {
  it("returns both html and text", () => {
    const result = renderHtmlTemplate(sampleWord);
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("returns valid HTML", () => {
    const result = renderHtmlTemplate(sampleWord);
    expect(result.html).toContain("<h1");
    expect(result.html).toContain("<p");
    expect(result.html).toContain("<blockquote>");
  });

  it("returns text as the raw markdown", () => {
    const result = renderHtmlTemplate(sampleWord);
    expect(result.text).toBe(renderMarkdownTemplate(sampleWord));
  });

  it("includes word in rendered HTML", () => {
    const result = renderHtmlTemplate(sampleWord);
    expect(result.html).toContain(sampleWord.word);
  });

  it("renders example as blockquote in HTML", () => {
    const result = renderHtmlTemplate(sampleWord);
    expect(result.html).toContain("<blockquote>");
    expect(result.html).toContain(sampleWord.example);
  });

  it("includes unsubscribe link in HTML when url is provided", () => {
    const result = renderHtmlTemplate(sampleWord, "https://example.com/unsub");
    expect(result.html).toContain("unsub");
  });

  it("omits unsubscribe link in HTML when url is not provided", () => {
    const result = renderHtmlTemplate(sampleWord);
    expect(result.html).not.toContain("Unsubscribe");
  });
});
