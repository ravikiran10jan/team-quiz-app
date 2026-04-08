import { db } from "./index";
import { quizzes, questions, options, teams, responses, quizState } from "./schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateId, generateQuizCode } from "../quiz-code";

// ─── Quiz CRUD ───

export function createQuiz(title: string, timePerQuestion: number) {
  const id = generateId();
  const code = generateQuizCode();

  db.insert(quizzes).values({ id, title, code, timePerQuestion }).run();
  db.insert(quizState).values({ quizId: id }).run();

  return { id, code };
}

export function listQuizzes() {
  return db.select().from(quizzes).orderBy(desc(quizzes.createdAt)).all();
}

export function getQuiz(id: string) {
  return db.select().from(quizzes).where(eq(quizzes.id, id)).get();
}

export function getQuizByCode(code: string) {
  return db
    .select()
    .from(quizzes)
    .where(eq(quizzes.code, code.toUpperCase()))
    .get();
}

export function updateQuiz(
  id: string,
  data: { title?: string; timePerQuestion?: number; status?: string }
) {
  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.timePerQuestion !== undefined)
    updates.timePerQuestion = data.timePerQuestion;
  if (data.status !== undefined) updates.status = data.status;

  return db.update(quizzes).set(updates).where(eq(quizzes.id, id)).run();
}

export function deleteQuiz(id: string) {
  return db.delete(quizzes).where(eq(quizzes.id, id)).run();
}

// ─── Questions ───

export function getQuestions(quizId: string) {
  return db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.orderNum)
    .all();
}

export function getQuestionsWithOptions(quizId: string) {
  const qs = getQuestions(quizId);
  return qs.map((q) => {
    const opts = db
      .select()
      .from(options)
      .where(eq(options.questionId, q.id))
      .orderBy(options.orderNum)
      .all();
    return { ...q, options: opts };
  });
}

export function upsertQuestions(
  quizId: string,
  questionsData: Array<{
    id?: string;
    text: string;
    orderNum: number;
    timeLimitSec?: number;
    points?: number;
    options: Array<{
      id?: string;
      text: string;
      isCorrect: boolean;
      orderNum: number;
    }>;
  }>
) {
  // Delete existing questions (cascade deletes options)
  db.delete(questions).where(eq(questions.quizId, quizId)).run();

  for (const q of questionsData) {
    const qId = q.id || generateId();
    db.insert(questions)
      .values({
        id: qId,
        quizId,
        text: q.text,
        orderNum: q.orderNum,
        timeLimitSec: q.timeLimitSec ?? 20,
        points: q.points ?? 1000,
      })
      .run();

    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      db.insert(options)
        .values({
          id: opt.id || generateId(),
          questionId: qId,
          text: opt.text,
          isCorrect: opt.isCorrect,
          orderNum: opt.orderNum ?? i,
        })
        .run();
    }
  }
}

// ─── Teams ───

export function createTeam(quizId: string, name: string, sessionToken: string) {
  const id = generateId();
  db.insert(teams).values({ id, quizId, name, sessionToken }).run();
  return { id, sessionToken };
}

export function getTeamsByQuiz(quizId: string) {
  return db.select().from(teams).where(eq(teams.quizId, quizId)).all();
}

export function getTeamByNameAndQuiz(quizId: string, name: string) {
  return db
    .select()
    .from(teams)
    .where(and(eq(teams.quizId, quizId), eq(teams.name, name)))
    .get();
}

// ─── Quiz State ───

export function getQuizState(quizId: string) {
  return db
    .select()
    .from(quizState)
    .where(eq(quizState.quizId, quizId))
    .get();
}

export function updateQuizState(
  quizId: string,
  data: {
    currentQuestionIdx?: number;
    questionStartedAt?: string | null;
    status?: "waiting" | "active" | "revealed" | "finished";
  }
) {
  return db.update(quizState).set(data).where(eq(quizState.quizId, quizId)).run();
}

// ─── Responses ───

export function submitResponse(data: {
  teamId: string;
  questionId: string;
  optionId: string | null;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsAwarded: number;
  streakAtTime: number;
}) {
  const id = generateId();
  db.insert(responses).values({ id, ...data }).run();
  return id;
}

export function getTeamResponse(teamId: string, questionId: string) {
  return db
    .select()
    .from(responses)
    .where(
      and(
        eq(responses.teamId, teamId),
        eq(responses.questionId, questionId)
      )
    )
    .get();
}

export function getTeamStreak(teamId: string, quizId: string): number {
  // Get all responses for this team in this quiz, ordered by submission time desc
  const teamResponses = db
    .select({ isCorrect: responses.isCorrect })
    .from(responses)
    .innerJoin(questions, eq(responses.questionId, questions.id))
    .where(and(eq(responses.teamId, teamId), eq(questions.quizId, quizId)))
    .orderBy(desc(responses.submittedAt))
    .all();

  let streak = 0;
  for (const r of teamResponses) {
    if (r.isCorrect) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getLeaderboard(quizId: string) {
  const results = db
    .select({
      teamId: teams.id,
      name: teams.name,
      totalScore: sql<number>`COALESCE(SUM(${responses.pointsAwarded}), 0)`.as(
        "total_score"
      ),
      correctCount:
        sql<number>`COALESCE(SUM(CASE WHEN ${responses.isCorrect} = 1 THEN 1 ELSE 0 END), 0)`.as(
          "correct_count"
        ),
    })
    .from(teams)
    .leftJoin(responses, eq(teams.id, responses.teamId))
    .where(eq(teams.quizId, quizId))
    .groupBy(teams.id)
    .orderBy(sql`total_score DESC`)
    .all();

  return results.map((r, i) => ({
    rank: i + 1,
    teamId: r.teamId,
    name: r.name,
    score: r.totalScore,
    correctCount: r.correctCount,
  }));
}

export function getQuestionResponseStats(questionId: string) {
  const stats = db
    .select({
      optionId: responses.optionId,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(responses)
    .where(eq(responses.questionId, questionId))
    .groupBy(responses.optionId)
    .all();

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  return { stats, total };
}
