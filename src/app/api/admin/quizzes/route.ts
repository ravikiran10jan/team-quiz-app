import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listQuizzes, createQuiz } from "@/lib/db/queries";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = listQuizzes();
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { title, timePerQuestion } = await request.json();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const quiz = createQuiz(title, timePerQuestion ?? 20);
  return NextResponse.json(quiz, { status: 201 });
}
