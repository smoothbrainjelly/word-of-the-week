export type WordData = {
  word: string;
  pronunciation: string;
  simple_pronunciation: string;
  part_of_speech: string;
  definition: string;
  etymology: string;
  example: string;
};

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

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

  const wordLine = word.part_of_speech
    ? `${esc(word.word)} &middot; ${esc(word.part_of_speech)}`
    : esc(word.word);

  let html = `<div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;padding:40px 20px;line-height:1.6">`;
  html += `<h1 style="font-size:14px;text-transform:uppercase;letter-spacing:2px;color:#888;margin:0 0 8px">Word of the Week</h1>`;
  html += `<h2 style="font-size:36px;margin:0 0 4px;font-weight:700">${wordLine}</h2>`;
  html += `<p style="font-size:16px;color:#666;margin:0 0 24px">${esc(word.pronunciation)} &mdash; ${esc(word.simple_pronunciation)}</p>`;
  html += `<hr style="border:none;border-top:2px solid #e5e5e5;margin:0 0 24px">`;
  html += `<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 4px">Definition</h3>`;
  html += `<p style="margin:0 0 20px;font-size:16px">${esc(word.definition)}</p>`;
  html += `<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 4px">Etymology</h3>`;
  html += `<p style="margin:0 0 20px;font-size:16px">${esc(word.etymology)}</p>`;
  html += `<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 4px">Example</h3>`;
  html += `<blockquote style="margin:0 0 0 16px;padding-left:16px;border-left:3px solid #ddd;font-style:italic;font-size:16px;color:#555">${esc(word.example)}</blockquote>`;

  if (unsubscribeUrl) {
    html += `<hr style="border:none;border-top:2px solid #e5e5e5;margin:24px 0">`;
    html += `<p style="font-size:13px;color:#888"><a href="${esc(unsubscribeUrl)}" style="color:#666">Unsubscribe</a> from Word of the Week.</p>`;
  }

  html += `</div>`;

  return { html, text: markdown };
}
