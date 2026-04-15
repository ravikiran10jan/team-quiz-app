import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getQuestionsWithOptions,
} from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { quizId } = await params;
  const quiz = getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
  const questionsWithOptions = getQuestionsWithOptions(quizId);
  return NextResponse.json({ ...quiz, questions: questionsWithOptions });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { quizId } = await params;
  const data = await request.json();

  if (data.code !== undefined) {
    const code = String(data.code).toUpperCase();
    if (!/^[A-Z0-9]{3,10}$/.test(code)) {
      return NextResponse.json(
        { error: "Code must be 3-10 alphanumeric characters" },
        { status: 400 }
      );
    }
    data.code = code;
  }

  try {
    updateQuiz(quizId, data);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "This code is already in use" },
        { status: 409 }
      );
    }
    throw err;
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { quizId } = await params;
  deleteQuiz(quizId);
  return NextResponse.json({ success: true });
}
