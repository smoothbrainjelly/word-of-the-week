import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  scard: vi.fn(),
  spop: vi.fn(),
  srandmember: vi.fn(),
  sadd: vi.fn(),
  sismember: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    scard: mocks.scard,
    spop: mocks.spop,
    srandmember: mocks.srandmember,
    sadd: mocks.sadd,
    sismember: mocks.sismember,
  },
}));

const batchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/gemini", () => ({
  generateWordBatch: batchMock,
}));

import { getPoolSize, getAvailableWord, previewWord, addUsedWord, addToPool, refillPool } from "@/lib/word-pool";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPoolSize", () => {
  it("returns the scard result", async () => {
    mocks.scard.mockResolvedValue(42);
    const size = await getPoolSize();
    expect(size).toBe(42);
    expect(mocks.scard).toHaveBeenCalledWith("word_pool");
  });

  it("returns 0 on Redis error", async () => {
    mocks.scard.mockRejectedValue(new Error("boom"));
    const size = await getPoolSize();
    expect(size).toBe(0);
  });
});

describe("getAvailableWord", () => {
  it("returns the popped word", async () => {
    mocks.spop.mockResolvedValue("ephemeral");
    const word = await getAvailableWord();
    expect(word).toBe("ephemeral");
    expect(mocks.spop).toHaveBeenCalledWith("word_pool");
  });

  it("returns null when pool is empty", async () => {
    mocks.spop.mockResolvedValue(null);
    const word = await getAvailableWord();
    expect(word).toBeNull();
  });

  it("returns null on Redis error", async () => {
    mocks.spop.mockRejectedValue(new Error("boom"));
    const word = await getAvailableWord();
    expect(word).toBeNull();
  });
});

describe("previewWord", () => {
  it("returns a random member without removing", async () => {
    mocks.srandmember.mockResolvedValue("serendipity");
    const word = await previewWord();
    expect(word).toBe("serendipity");
    expect(mocks.srandmember).toHaveBeenCalledWith("word_pool");
  });

  it("returns null when pool is empty", async () => {
    mocks.srandmember.mockResolvedValue(null);
    const word = await previewWord();
    expect(word).toBeNull();
  });

  it("returns null on Redis error", async () => {
    mocks.srandmember.mockRejectedValue(new Error("boom"));
    const word = await previewWord();
    expect(word).toBeNull();
  });
});

describe("addUsedWord", () => {
  it("adds the lowercased word to used_words", async () => {
    mocks.sadd.mockResolvedValue(1);
    await addUsedWord("Serendipity");
    expect(mocks.sadd).toHaveBeenCalledWith("used_words", "serendipity");
  });

  it("swallows Redis errors", async () => {
    mocks.sadd.mockRejectedValue(new Error("boom"));
    await expect(addUsedWord("test")).resolves.toBeUndefined();
  });
});

describe("addToPool", () => {
  it("returns zeros for empty candidate list", async () => {
    const result = await addToPool([]);
    expect(result).toEqual({ added: 0, total: 0 });
  });

  it("filters out words already in the pool", async () => {
    mocks.sismember
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValue(0);
    mocks.sadd.mockResolvedValue(1);

    const result = await addToPool(["hello", "world"]);

    expect(result.total).toBe(2);
    expect(result.added).toBe(1);
    expect(mocks.sadd).toHaveBeenCalledWith("word_pool", "world");
  });

  it("filters out words already in used_words", async () => {
    mocks.sismember
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValue(0);
    mocks.sadd.mockResolvedValue(1);

    const result = await addToPool(["fresh"]);

    expect(mocks.sismember).toHaveBeenCalledWith("word_pool", "fresh");
    expect(mocks.sismember).toHaveBeenCalledWith("used_words", "fresh");
    expect(result.added).toBe(0);
    expect(result.total).toBe(1);
  });

  it("adds all candidates when none are in pool or used", async () => {
    mocks.sismember.mockResolvedValue(0);
    mocks.sadd.mockResolvedValue(3);

    const result = await addToPool(["a", "b", "c"]);

    expect(result.added).toBe(3);
    expect(result.total).toBe(3);
    expect(mocks.sadd).toHaveBeenCalledWith("word_pool", "a", "b", "c");
  });

  it("lowercases all words before checking and adding", async () => {
    mocks.sismember.mockResolvedValue(0);
    mocks.sadd.mockResolvedValue(2);

    const result = await addToPool(["Hello", "WORLD"]);

    expect(mocks.sismember).toHaveBeenCalledWith("word_pool", "hello");
    expect(mocks.sismember).toHaveBeenCalledWith("word_pool", "world");
    expect(result.added).toBe(2);
  });

  it("returns zero added when all candidates are duplicates", async () => {
    mocks.sismember.mockResolvedValue(1);

    const result = await addToPool(["dup", "dup2"]);

    expect(result).toEqual({ added: 0, total: 2 });
    expect(mocks.sadd).not.toHaveBeenCalled();
  });

  it("handles sismember errors per candidate gracefully", async () => {
    mocks.sismember
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mocks.sadd.mockResolvedValue(1);

    const result = await addToPool(["bad", "good"]);

    expect(result.total).toBe(2);
    expect(result.added).toBe(1);
  });
});

describe("refillPool", () => {
  it("calls generateWordBatch then adds results to pool", async () => {
    const mockWords = ["word1", "word2", "word3"];
    batchMock.mockResolvedValue(mockWords);
    mocks.sismember.mockResolvedValue(0);
    mocks.sadd.mockResolvedValue(3);

    const result = await refillPool();

    expect(batchMock).toHaveBeenCalledWith(500);
    expect(result).toEqual({ added: 3, total: 3 });
  });

  it("returns zero added when batch returns empty", async () => {
    batchMock.mockResolvedValue([]);

    const result = await refillPool();

    expect(result).toEqual({ added: 0, total: 0 });
  });
});
