import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: async () => ({ userId: "test-user", role: "admin" as const }),
  escapeHtml: (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;"),
}));

import { POST } from "@/app/api/preview/render/route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/preview/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/preview/render", () => {
  it("returns 400 when word is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Word data required");
  });

  it("returns 400 when word.word is missing", async () => {
    const res = await POST(makeRequest({ word: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Word data required");
  });

  it("renders compact HTML when compact is true", async () => {
    const res = await POST(
      makeRequest({
        compact: true,
        word: "Serendipity",
        pronunciation: "/ˌserənˈdɪpɪti/",
        simple_pronunciation: "ser-uhn-DIP-uh-tee",
        definition: "A happy accident.",
        etymology: "From Persian folklore.",
        example: "What a happy accident!",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.html).toContain("Serendipity");
    expect(json.html).toContain("Word of the Week");
    expect(json.html).not.toContain("<h1");
  });

  it("renders full HTML when compact is falsy", async () => {
    const res = await POST(
      makeRequest({
        word: "Serendipity",
        pronunciation: "/ˌserənˈdɪpɪti/",
        simple_pronunciation: "ser-uhn-DIP-uh-tee",
        definition: "A happy accident.",
        etymology: "From Persian folklore.",
        example: "What a happy accident!",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.html).toContain("Serendipity");
    expect(json.html).toContain("<h1");
    expect(json.html).toContain("max-width:600px");
  });

  it("renders full HTML when compact is false", async () => {
    const res = await POST(
      makeRequest({
        compact: false,
        word: "Ephemeral",
        pronunciation: "/ɪˈfemərəl/",
        simple_pronunciation: "ih-FEM-er-uhl",
        definition: "Lasting for a short time.",
        etymology: "From Greek ephēmeros.",
        example: "The beauty was ephemeral.",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.html).toContain("Ephemeral");
    expect(json.html).toContain("<h1");
    expect(json.html).toContain("max-width:600px");
  });

  it("returns html as a string", async () => {
    const res = await POST(
      makeRequest({
        word: "Test",
        pronunciation: "/test/",
        simple_pronunciation: "test",
        definition: "A test.",
        etymology: "Test origin.",
        example: "Test example.",
      })
    );
    const json = await res.json();
    expect(typeof json.html).toBe("string");
  });
});
