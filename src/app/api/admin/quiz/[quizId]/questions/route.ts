import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { upsertQuestions, getQuestionsWithOptions } from "@/lib/db/queries";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { quizId } = await params;
  const { questions } = await request.json();

  if (!Array.isArray(questions)) {
    return NextResponse.json(
      { error: "questions must be an array" },
      { status: 400 }
    );
  }

  upsertQuestions(quizId, questions);
  const updated = getQuestionsWithOptions(quizId);
  return NextResponse.json(updated);
}
