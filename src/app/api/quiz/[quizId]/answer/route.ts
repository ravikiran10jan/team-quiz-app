import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/session";
import {
  getQuizState,
  getTeamResponse,
  getTeamStreak,
  submitResponse,
  getLeaderboard,
  getQuestionsWithOptions,
  getQuestionResponses,
} from "@/lib/db/queries";
import { options } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { calculatePoints } from "@/lib/scoring";
import { broadcast } from "@/lib/sse-manager";

export async function POST(
  request: Request,
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

  const { questionId, optionId } = await request.json();
  if (!questionId || !optionId) {
    return NextResponse.json(
      { error: "questionId and optionId are required" },
      { status: 400 }
    );
  }

  const state = getQuizState(quizId);
  if (!state || state.status !== "active") {
    return NextResponse.json(
      { error: "Question is not active" },
      { status: 400 }
    );
  }

  // Verify question is the current one
  const allQuestions = getQuestionsWithOptions(quizId);
  const currentQ = allQuestions[state.currentQuestionIdx];
  if (!currentQ || currentQ.id !== questionId) {
    return NextResponse.json(
      { error: "This is not the current question" },
      { status: 400 }
    );
  }

  // Check if already answered
  const existingResponse = getTeamResponse(session.teamId, questionId);
  if (existingResponse) {
    return NextResponse.json(
      { error: "Already answered this question" },
      { status: 409 }
    );
  }

  // Calculate time taken
  const startedAt = new Date(state.questionStartedAt!).getTime();
  const now = Date.now();
  const timeTakenMs = now - startedAt;
  const timeLimitMs = currentQ.timeLimitSec * 1000;

  // Check if time expired (add 2s grace period for network latency)
  if (timeTakenMs > timeLimitMs + 2000) {
    return NextResponse.json({ error: "Time expired" }, { status: 400 });
  }

  // Check if option is correct
  const selectedOption = db
    .select()
    .from(options)
    .where(eq(options.id, optionId))
    .get();
  if (!selectedOption || selectedOption.questionId !== questionId) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  const isCorrect = selectedOption.isCorrect;
  const currentStreak = getTeamStreak(session.teamId, quizId);

  let pointsAwarded = 0;
  let scoreResult = { totalPoints: 0, speedBonus: 0, streakMultiplier: 1, streak: 0 };

  if (isCorrect) {
    scoreResult = calculatePoints(
      currentQ.points,
      timeLimitMs,
      timeTakenMs,
      currentStreak
    );
    pointsAwarded = scoreResult.totalPoints;
  }

  submitResponse({
    teamId: session.teamId,
    questionId,
    optionId,
    isCorrect,
    timeTakenMs,
    pointsAwarded,
    streakAtTime: isCorrect ? scoreResult.streak : 0,
  });

  // Broadcast leaderboard update
  const leaderboard = getLeaderboard(quizId);
  const questionStats = getQuestionResponses(questionId, quizId);
  broadcast(quizId, "leaderboard:update", { rankings: leaderboard, questionStats });

  const correctOption = currentQ.options.find((o) => o.isCorrect);

  return NextResponse.json({
    correct: isCorrect,
    pointsAwarded,
    speedBonus: scoreResult.speedBonus,
    streak: isCorrect ? scoreResult.streak : 0,
    streakMultiplier: scoreResult.streakMultiplier,
    correctOptionId: correctOption?.id,
  });
}
