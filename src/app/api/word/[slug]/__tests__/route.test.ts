import { describe, it, expect, vi, beforeEach } from "vitest";

const { redisGet, mockRequireAuth } = vi.hoisted(() => {
  const mockHistory = [
    {
      id: "entry-1",
      word: "Serendipity",
      pronunciation: "/ˌserənˈdɪpɪti/",
      simple_pronunciation: "ser-uhn-DIP-uh-tee",
      part_of_speech: "noun",
      definition: "A happy accident.",
      etymology: "From Persian folklore.",
      example: "What a happy accident!",
      sentAt: "2026-08-13T00:00:00.000Z",
      recipientCount: 3,
    },
    {
      id: "entry-2",
      word: "Ephemeral",
      pronunciation: "/ɪˈfemərəl/",
      simple_pronunciation: "ih-FEM-er-uhl",
      part_of_speech: "adjective",
      definition: "Lasting for a short time.",
      etymology: "From Greek ephēmeros.",
      example: "The beauty was ephemeral.",
      sentAt: "2026-08-20T00:00:00.000Z",
      recipientCount: 5,
    },
  ];
  return {
    mockHistory,
    redisGet: vi.fn(async () => mockHistory),
    mockRequireAuth: vi.fn(async () => ({ userId: "test-user", role: "admin" as const })),
  };
});

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/redis", () => ({
  redis: { get: redisGet },
}));

import { GET } from "@/app/api/word/[slug]/route";

function callGet(slug: string): Promise<Response> {
  const context = { params: Promise.resolve({ slug }) };
  return GET(new Request(`http://localhost:3000/api/word/${slug}`), context);
}

describe("GET /api/word/[slug]", () => {
  beforeEach(() => {
    redisGet.mockClear();
    mockRequireAuth.mockClear();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValueOnce(null);
    const res = await callGet("serendipity");
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns the matching history entry by word slug", async () => {
    const res = await callGet("serendipity");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.word).toBe("Serendipity");
    expect(json.id).toBe("entry-1");
    expect(json.recipientCount).toBe(3);
  });

  it("is case-insensitive", async () => {
    const res = await callGet("SERENDIPITY");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.word).toBe("Serendipity");
  });

  it("returns the latest entry when multiple words share a slug", async () => {
    const history = [
      {
        id: "old",
        word: "well being",
        pronunciation: "",
        simple_pronunciation: "",
        part_of_speech: "noun",
        definition: "Old.",
        etymology: "",
        example: "",
        sentAt: "2026-01-01T00:00:00.000Z",
        recipientCount: 1,
      },
      {
        id: "new",
        word: "well-being",
        pronunciation: "",
        simple_pronunciation: "",
        part_of_speech: "noun",
        definition: "New.",
        etymology: "",
        example: "",
        sentAt: "2026-02-01T00:00:00.000Z",
        recipientCount: 1,
      },
    ];
    redisGet.mockResolvedValueOnce(history);
    const res = await callGet("well-being");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("new");
  });

  it("matches words with an apostrophe", async () => {
    const history = [
      {
        id: "apos",
        word: "don't",
        pronunciation: "",
        simple_pronunciation: "",
        part_of_speech: "noun",
        definition: "Contraction.",
        etymology: "",
        example: "",
        sentAt: "2026-03-01T00:00:00.000Z",
        recipientCount: 1,
      },
    ];
    redisGet.mockResolvedValueOnce(history);
    const res = await callGet("don-t");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("apos");
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await callGet("does-not-exist");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("returns 404 when history is empty", async () => {
    redisGet.mockResolvedValueOnce([]);
    const res = await callGet("serendipity");
    expect(res.status).toBe(404);
  });
});
