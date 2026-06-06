import { NextResponse } from "next/server";
import { requireAuth, escapeHtml } from "@/lib/auth";
import { renderHtmlTemplate } from "@/lib/email-template";

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { compact, ...word } = await request.json();
  if (!word?.word) {
    return NextResponse.json({ error: "Word data required" }, { status: 400 });
  }

  if (compact) {
    const html = `<div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.5">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:2px">Word of the Week</div>
<div style="font-size:28px;font-weight:700;margin-bottom:2px">${escapeHtml(word.word)}</div>
<div style="font-size:14px;color:#666;margin-bottom:12px">${escapeHtml(word.pronunciation || "")}${word.pronunciation && word.simple_pronunciation ? " — " : ""}${escapeHtml(word.simple_pronunciation || "")}</div>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 12px">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px">Definition</div>
<div style="font-size:14px;margin-bottom:12px">${escapeHtml(word.definition)}</div>
<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px">Etymology</div>
<div style="font-size:14px;margin-bottom:12px">${escapeHtml(word.etymology)}</div>
<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px">Example</div>
<blockquote style="margin:0 0 0 12px;padding-left:12px;border-left:2px solid #ddd;font-style:italic;font-size:14px;color:#555">${escapeHtml(word.example)}</blockquote>
</div>`;
    return NextResponse.json({ html });
  }

  const { html: inner } = renderHtmlTemplate(word, "#");
  const html = `<div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;padding:40px 20px;line-height:1.6">${inner}</div>`;

  return NextResponse.json({ html });
}
