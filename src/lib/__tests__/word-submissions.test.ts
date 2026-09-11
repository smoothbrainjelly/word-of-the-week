import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  sismember: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: mocks.get,
    set: mocks.set,
    sismember: mocks.sismember,
  },
}));

vi.mock("@/lib/word-pool", () => ({
  addToPool: vi.fn(async (candidates: string[]) => ({ added: candidates.length, total: candidates.length })),
}));

import {
  listSubmissions,
  isWordTaken,
  submitWord,
  approveSubmission,
  rejectSubmission,
} from "@/lib/word-submissions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listSubmissions", () => {
  it("returns empty list when nothing stored", async () => {
    mocks.get.mockResolvedValue(null);
    const result = await listSubmissions();
    expect(result).toEqual([]);
  });

  it("filters by status", async () => {
    mocks.get.mockResolvedValue([
      { id: "1", status: "pending" },
      { id: "2", status: "approved" },
    ]);
    const result = await listSubmissions("pending");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns empty list on redis error", async () => {
    mocks.get.mockRejectedValue(new Error("boom"));
    const result = await listSubmissions();
    expect(result).toEqual([]);
  });
});

describe("isWordTaken", () => {
  it("is not taken when word is fresh", async () => {
    mocks.sismember.mockResolvedValue(0);
    mocks.get.mockResolvedValue([]);
    const result = await isWordTaken("serendipity");
    expect(result.taken).toBe(false);
  });

  it("is taken when word is in pool", async () => {
    mocks.sismember.mockResolvedValueOnce(1);
    const result = await isWordTaken("serendipity");
    expect(result.taken).toBe(true);
    expect(result.reason).toMatch(/already in the word pool/);
  });

  it("is taken when word was used", async () => {
    mocks.sismember.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const result = await isWordTaken("ephemeral");
    expect(result.taken).toBe(true);
    expect(result.reason).toMatch(/already been used/);
  });

  it("is taken when word is pending review", async () => {
    mocks.sismember.mockResolvedValue(0);
    mocks.get.mockResolvedValue([
      { id: "1", word: "serendipity", status: "pending" },
    ]);
    const result = await isWordTaken("serendipity");
    expect(result.taken).toBe(true);
    expect(result.reason).toMatch(/pending review/);
  });
});

describe("submitWord", () => {
  it("rejects empty word", async () => {
    const result = await submitWord("   ", "Alice", "u1");
    expect(result.ok).toBe(false);
  });

  it("rejects invalid characters", async () => {
    const result = await submitWord("hello world;", "Alice", "u1");
    expect(result.ok).toBe(false);
  });

  it("rejects a word that is already taken", async () => {
    mocks.sismember.mockResolvedValue(1);
    const result = await submitWord("serendipity", "Alice", "u1");
    expect(result.ok).toBe(false);
  });

  it("stores a pending submission and normalizes casing", async () => {
    mocks.sismember.mockResolvedValue(0);
    mocks.get.mockResolvedValue([]);
    const result = await submitWord("Serendipity", "Alice", "u1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.word).toBe("serendipity");
      expect(result.submission.status).toBe("pending");
      expect(result.submission.submittedById).toBe("u1");
      expect(mocks.set).toHaveBeenCalled();
    }
  });

  it("rejects duplicate in pending queue", async () => {
    mocks.sismember.mockResolvedValue(0);
    mocks.get.mockResolvedValue([
      { id: "1", word: "serendipity", status: "pending" },
    ]);
    const result = await submitWord("serendipity", "Alice", "u1");
    expect(result.ok).toBe(false);
  });
});

describe("approveSubmission", () => {
  it("approves a pending submission and adds to pool", async () => {
    mocks.sismember.mockResolvedValue(0);
    mocks.get.mockResolvedValue([
      { id: "1", word: "serendipity", status: "pending", submittedById: "u1" },
    ]);
    const result = await approveSubmission("1", "admin1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.status).toBe("approved");
      expect(result.submission.handledBy).toBe("admin1");
      expect(mocks.set).toHaveBeenCalled();
    }
  });

  it("rejects when not found", async () => {
    mocks.get.mockResolvedValue([]);
    const result = await approveSubmission("nope", "admin1");
    expect(result.ok).toBe(false);
  });

  it("rejects when word is no longer available", async () => {
    mocks.sismember.mockResolvedValueOnce(1);
    mocks.get.mockResolvedValue([
      { id: "1", word: "serendipity", status: "pending", submittedById: "u1" },
    ]);
    const result = await approveSubmission("1", "admin1");
    expect(result.ok).toBe(false);
  });
});

describe("rejectSubmission", () => {
  it("rejects a pending submission", async () => {
    mocks.get.mockResolvedValue([
      { id: "1", word: "serendipity", status: "pending", submittedById: "u1" },
    ]);
    const result = await rejectSubmission("1", "admin1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.submission.status).toBe("rejected");
      expect(result.submission.handledBy).toBe("admin1");
    }
  });

  it("rejects when not found", async () => {
    mocks.get.mockResolvedValue([]);
    const result = await rejectSubmission("nope", "admin1");
    expect(result.ok).toBe(false);
  });
});
