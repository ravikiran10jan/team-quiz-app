import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/session";
import {
  getQuiz,
  getQuizState,
  getQuestionsWithOptions,
  getTeamsByQuiz,
  getLeaderboard,
  getTeamResponse,
  getTeamStreak,
} from "@/lib/db/queries";
import { teams } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await getTeamSession();
  if (!session) {
    return NextResponse.json({ error: "Not joined" }, { status: 401 });
  }

  const { quizId } = await params;
  if (session.quizId !== quizId) {
    return NextResponse.json({ error: "Wrong quiz" }, { status: 403 });
  }

  const quiz = getQuiz(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const state = getQuizState(quizId);
  const allTeams = getTeamsByQuiz(quizId);
  const leaderboard = getLeaderboard(quizId);

  const team = db
    .select()
    .from(teams)
    .where(eq(teams.id, session.teamId))
    .get();

  const result: Record<string, unknown> = {
    quiz: { id: quiz.id, title: quiz.title, status: quiz.status },
    state,
    teamCount: allTeams.length,
    teamName: team?.name,
    teamId: session.teamId,
    leaderboard,
  };

  // If there's an active question, include it (without correct answer)
  if (state && state.status === "active" && state.currentQuestionIdx >= 0) {
    const questions = getQuestionsWithOptions(quizId);
    const currentQ = questions[state.currentQuestionIdx];
    if (currentQ) {
      const existingResponse = getTeamResponse(session.teamId, currentQ.id);
      result.currentQuestion = {
        questionIdx: state.currentQuestionIdx,
        questionId: currentQ.id,
        text: currentQ.text,
        options: currentQ.options.map((o) => ({ id: o.id, text: o.text })),
        timeLimit: currentQ.timeLimitSec,
        startedAt: state.questionStartedAt,
        totalQuestions: questions.length,
      };
      result.alreadyAnswered = !!existingResponse;
      if (existingResponse) {
        result.previousResponse = {
          optionId: existingResponse.optionId,
          isCorrect: existingResponse.isCorrect,
          pointsAwarded: existingResponse.pointsAwarded,
        };
      }
    }
  }

  // Include streak info
  const streak = getTeamStreak(session.teamId, quizId);
  result.streak = streak;

  return NextResponse.json(result);
}
