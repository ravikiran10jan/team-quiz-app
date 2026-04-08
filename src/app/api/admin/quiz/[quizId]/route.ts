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
  updateQuiz(quizId, data);
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
