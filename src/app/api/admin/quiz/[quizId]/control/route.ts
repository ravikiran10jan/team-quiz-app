import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  getQuizState,
  updateQuizState,
  getQuestionsWithOptions,
  getLeaderboard,
  getQuestionResponses,
  updateQuiz,
} from "@/lib/db/queries";
import { broadcast } from "@/lib/sse-manager";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quizId } = await params;
  const { action } = await request.json();
  const state = getQuizState(quizId);
  if (!state) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const allQuestions = getQuestionsWithOptions(quizId);

  switch (action) {
    case "start": {
      if (allQuestions.length === 0) {
        return NextResponse.json(
          { error: "Quiz has no questions" },
          { status: 400 }
        );
      }
      updateQuizState(quizId, {
        currentQuestionIdx: 0,
        questionStartedAt: new Date().toISOString(),
        status: "active",
      });
      updateQuiz(quizId, { status: "active" });

      const q = allQuestions[0];
      broadcast(quizId, "quiz:started", { quizId, totalQuestions: allQuestions.length });
      broadcast(quizId, "question:active", {
        questionIdx: 0,
        questionId: q.id,
        text: q.text,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        timeLimit: q.timeLimitSec,
        startedAt: new Date().toISOString(),
        totalQuestions: allQuestions.length,
      });
      break;
    }

    case "next_question": {
      const nextIdx = state.currentQuestionIdx + 1;
      if (nextIdx >= allQuestions.length) {
        return NextResponse.json(
          { error: "No more questions" },
          { status: 400 }
        );
      }
      const now = new Date().toISOString();
      updateQuizState(quizId, {
        currentQuestionIdx: nextIdx,
        questionStartedAt: now,
        status: "active",
      });

      const q = allQuestions[nextIdx];
      broadcast(quizId, "question:active", {
        questionIdx: nextIdx,
        questionId: q.id,
        text: q.text,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        timeLimit: q.timeLimitSec,
        startedAt: now,
        totalQuestions: allQuestions.length,
      });
      break;
    }

    case "reveal": {
      updateQuizState(quizId, { status: "revealed" });
      const currentQ = allQuestions[state.currentQuestionIdx];
      if (currentQ) {
        const correctOption = currentQ.options.find((o) => o.isCorrect);
        const leaderboard = getLeaderboard(quizId);
        const questionStats = getQuestionResponses(currentQ.id, quizId);
        broadcast(quizId, "question:revealed", {
          questionId: currentQ.id,
          correctOptionId: correctOption?.id,
          leaderboard,
          questionStats,
        });
      }
      break;
    }

    case "end": {
      updateQuizState(quizId, { status: "finished" });
      updateQuiz(quizId, { status: "finished" });
      const finalLeaderboard = getLeaderboard(quizId);
      broadcast(quizId, "quiz:ended", { finalRankings: finalLeaderboard });
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const updatedState = getQuizState(quizId);
  return NextResponse.json(updatedState);
}
