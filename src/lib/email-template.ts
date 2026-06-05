import { marked } from "marked";

export type WordData = {
  word: string;
  pronunciation: string;
  simple_pronunciation: string;
  definition: string;
  etymology: string;
  example: string;
};

export function renderMarkdownTemplate(word: WordData, unsubscribeUrl?: string): string {
  const lines = [
    `# Word of the Week`,
    ``,
    `# ${word.word}`,
    ``,
    `${word.pronunciation} — ${word.simple_pronunciation}`,
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
  ];

  if (unsubscribeUrl) {
    lines.push(``, `---`, ``, `[Unsubscribe](${unsubscribeUrl}) from Word of the Week.`);
  }

  return lines.join("\n");
}

export function renderHtmlTemplate(word: WordData, unsubscribeUrl?: string): { html: string; text: string } {
  const markdown = renderMarkdownTemplate(word, unsubscribeUrl);
  const html = marked.parse(markdown) as string;
  return { html, text: markdown };
}
