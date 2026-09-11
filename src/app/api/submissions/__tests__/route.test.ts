import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockGetUsers: vi.fn(),
  mockListSubmissions: vi.fn(),
  mockSubmitWord: vi.fn(),
  mockApproveSubmission: vi.fn(),
  mockRejectSubmission: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mocks.mockRequireAuth,
  requireAdmin: mocks.mockRequireAdmin,
  getUsers: mocks.mockGetUsers,
}));

vi.mock("@/lib/word-submissions", () => ({
  listSubmissions: mocks.mockListSubmissions,
  submitWord: mocks.mockSubmitWord,
  approveSubmission: mocks.mockApproveSubmission,
  rejectSubmission: mocks.mockRejectSubmission,
}));

import { GET, POST, PUT } from "@/app/api/submissions/route";

const adminUser = { userId: "admin-1", role: "admin" as const };
const regularUser = { userId: "user-1", role: "user" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/submissions", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.mockRequireAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/submissions"));
    expect(res.status).toBe(401);
  });

  it("returns all submissions for admins", async () => {
    mocks.mockRequireAuth.mockResolvedValue(adminUser);
    mocks.mockListSubmissions.mockResolvedValue([{ id: "1" }]);
    const res = await GET(new Request("http://localhost/api/submissions"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.submissions).toHaveLength(1);
    expect(mocks.mockListSubmissions).toHaveBeenCalledWith(undefined);
  });

  it("returns only the user's pending submissions for regular users", async () => {
    mocks.mockRequireAuth.mockResolvedValue(regularUser);
    mocks.mockListSubmissions.mockResolvedValue([
      { id: "1", submittedById: "user-1", status: "pending" },
      { id: "2", submittedById: "other", status: "pending" },
    ]);
    const res = await GET(new Request("http://localhost/api/submissions"));
    const json = await res.json();
    expect(json.submissions).toEqual([{ id: "1", submittedById: "user-1", status: "pending" }]);
  });
});

describe("POST /api/submissions", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.mockRequireAuth.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({ word: "serendipity" }),
    }));
    expect(res.status).toBe(401);
  });

  it("rejects missing word", async () => {
    mocks.mockRequireAuth.mockResolvedValue(regularUser);
    const res = await POST(new Request("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it("submits a word and returns the user's submissions", async () => {
    mocks.mockRequireAuth.mockResolvedValue(regularUser);
    mocks.mockGetUsers.mockResolvedValue([{ id: "user-1", name: "Alice" }]);
    mocks.mockSubmitWord.mockResolvedValue({
      ok: true,
      submission: { id: "s1", word: "serendipity", submittedById: "user-1", status: "pending" },
    });
    mocks.mockListSubmissions.mockResolvedValue([
      { id: "s1", word: "serendipity", submittedById: "user-1", status: "pending" },
    ]);
    const res = await POST(new Request("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({ word: "Serendipity" }),
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(mocks.mockSubmitWord).toHaveBeenCalledWith("Serendipity", "Alice", "user-1");
    expect(json.submissions).toHaveLength(1);
  });

  it("returns 400 when submit fails", async () => {
    mocks.mockRequireAuth.mockResolvedValue(regularUser);
    mocks.mockGetUsers.mockResolvedValue([{ id: "user-1", name: "Alice" }]);
    mocks.mockSubmitWord.mockResolvedValue({ ok: false, error: "Duplicate" });
    const res = await POST(new Request("http://localhost/api/submissions", {
      method: "POST",
      body: JSON.stringify({ word: "serendipity" }),
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Duplicate");
  });
});

describe("PUT /api/submissions", () => {
  it("returns 401 when not admin", async () => {
    mocks.mockRequireAdmin.mockResolvedValue(null);
    const res = await PUT(new Request("http://localhost/api/submissions", {
      method: "PUT",
      body: JSON.stringify({ id: "1", action: "approve" }),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid action", async () => {
    mocks.mockRequireAdmin.mockResolvedValue(adminUser);
    const res = await PUT(new Request("http://localhost/api/submissions", {
      method: "PUT",
      body: JSON.stringify({ id: "1", action: "nope" }),
    }));
    expect(res.status).toBe(400);
  });

  it("approves and returns updated submission", async () => {
    mocks.mockRequireAdmin.mockResolvedValue(adminUser);
    mocks.mockApproveSubmission.mockResolvedValue({
      ok: true,
      submission: { id: "1", status: "approved" },
    });
    const res = await PUT(new Request("http://localhost/api/submissions", {
      method: "PUT",
      body: JSON.stringify({ id: "1", action: "approve" }),
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.submission.status).toBe("approved");
    expect(mocks.mockApproveSubmission).toHaveBeenCalledWith("1", "admin-1");
  });

  it("returns 409 when approval conflicts", async () => {
    mocks.mockRequireAdmin.mockResolvedValue(adminUser);
    mocks.mockApproveSubmission.mockResolvedValue({ ok: false, error: "Taken" });
    const res = await PUT(new Request("http://localhost/api/submissions", {
      method: "PUT",
      body: JSON.stringify({ id: "1", action: "approve" }),
    }));
    expect(res.status).toBe(409);
  });
});
