import { NextResponse } from "next/server";
import {
  getQuiz,
  getQuizState,
  getLeaderboard,
  getTeamsByQuiz,
  getQuestionsWithOptions,
} from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params;
  const quiz = getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const state = getQuizState(quizId);
  const leaderboard = getLeaderboard(quizId);
  const teamCount = getTeamsByQuiz(quizId).length;

  let currentQuestion: { questionIdx: number; totalQuestions: number; text: string } | null = null;

  if (state && state.currentQuestionIdx >= 0) {
    const allQuestions = getQuestionsWithOptions(quizId);
    const q = allQuestions[state.currentQuestionIdx];
    if (q) {
      currentQuestion = {
        questionIdx: state.currentQuestionIdx,
        totalQuestions: allQuestions.length,
        text: q.text,
      };
    }
  }

  return NextResponse.json({
    quiz: { id: quiz.id, title: quiz.title, status: quiz.status },
    state: state ? { status: state.status, currentQuestionIdx: state.currentQuestionIdx } : null,
    leaderboard,
    teamCount,
    currentQuestion,
  });
}
