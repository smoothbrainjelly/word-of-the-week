import { NextResponse } from "next/server";
import { requireAuth, requireAdmin, getUsers } from "@/lib/auth";
import {
  listSubmissions,
  submitWord,
  approveSubmission,
  rejectSubmission,
} from "@/lib/word-submissions";

export async function GET(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (user.role === "admin") {
    const submissions = await listSubmissions(
      status === "pending" || status === "approved" || status === "rejected" ? status : undefined
    );
    return NextResponse.json({ submissions });
  }

  const submissions = await listSubmissions("pending");
  const mine = submissions.filter((s) => s.submittedById === user.userId);
  return NextResponse.json({ submissions: mine });
}

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { word } = await request.json();
  if (!word) {
    return NextResponse.json({ error: "Word is required" }, { status: 400 });
  }

  const users = await getUsers();
  const currentUser = users.find((u) => u.id === user.userId);
  const name = currentUser?.name ?? "unknown";

  const result = await submitWord(word, name, user.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const all = await listSubmissions("pending");
  const mine = all.filter((s) => s.submittedById === user.userId);
  const submission = mine.find((s) => s.id === result.submission.id) ?? result.submission;

  return NextResponse.json(
    { submission, submissions: mine },
    { status: 201 }
  );
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await request.json();
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "id and action (approve|reject) are required" }, { status: 400 });
  }

  const result =
    action === "approve"
      ? await approveSubmission(id, admin.userId)
      : await rejectSubmission(id, admin.userId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: "conflict" }, { status: 409 });
  }

  return NextResponse.json({ submission: result.submission });
}
