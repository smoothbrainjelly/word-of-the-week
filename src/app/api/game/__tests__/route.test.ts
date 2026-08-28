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
    mockRequireAuth: vi.fn(
      async (): Promise<{ userId: string; role: "user" | "admin" } | null> => ({
        userId: "test-user",
        role: "admin",
      })
    ),
  };
});

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/redis", () => ({
  redis: { get: redisGet },
}));

import { GET } from "@/app/api/game/route";

describe("GET /api/game", () => {
  beforeEach(() => {
    redisGet.mockClear();
    mockRequireAuth.mockClear();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns the full history as entries", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.entries).toHaveLength(2);
    expect(json.entries[0]).toMatchObject({ id: "entry-1", word: "Serendipity" });
    expect(redisGet).toHaveBeenCalledWith("history");
  });

  it("returns an empty list when history is empty", async () => {
    redisGet.mockResolvedValueOnce([]);
    const res = await GET();
    const json = await res.json();
    expect(json.entries).toEqual([]);
  });
});
