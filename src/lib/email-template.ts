import { marked } from "marked";

export type WordData = {
  word: string;
  definition: string;
  etymology: string;
  example: string;
};

export function renderMarkdownTemplate(word: WordData): string {
  return [
    `# Word of the Day`,
    ``,
    `# ${word.word}`,
    ``,
    `---`,
    ``,
    `### Definition`,
    ``,
    word.definition,
    ``,
    `### Etymology`,
    ``,
    word.etymology,
    ``,
    `### Example`,
    ``,
    `> ${word.example}`,
  ].join("\n");
}

export function renderHtmlTemplate(word: WordData): { html: string; text: string } {
  const markdown = renderMarkdownTemplate(word);
  const html = marked.parse(markdown) as string;
  return { html, text: markdown };
}
