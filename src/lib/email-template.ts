import { marked } from "marked";

export type WordData = {
  word: string;
  pronunciation: string;
  simple_pronunciation: string;
  part_of_speech: string;
  definition: string;
  etymology: string;
  example: string;
};

export function renderMarkdownTemplate(word: WordData, unsubscribeUrl?: string): string {
  const wordLine = word.part_of_speech
    ? `# ${word.word} · ${word.part_of_speech}`
    : `# ${word.word}`;

  const lines = [
    `# Word of the Week`,
    ``,
    wordLine,
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
  const inner = marked.parse(markdown) as string;
  const html = `<div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;padding:40px 20px;line-height:1.6">${inner}</div>`;
  return { html, text: markdown };
}
