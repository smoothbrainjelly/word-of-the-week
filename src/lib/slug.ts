export function wordToSlug(word: string): string {
  return (
    word
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "word"
  );
}
