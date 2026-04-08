import { NextResponse } from "next/server";
import {
  getQuizByCode,
  getTeamByNameAndQuiz,
  createTeam,
  getTeamsByQuiz,
} from "@/lib/db/queries";
import { setTeamSessionCookie } from "@/lib/session";
import { nanoid } from "nanoid";
import { broadcast } from "@/lib/sse-manager";

export async function POST(request: Request) {
  const { code, teamName } = await request.json();

  if (!code || !teamName) {
    return NextResponse.json(
      { error: "Code and name are required" },
      { status: 400 }
    );
  }

  const trimmedName = teamName.trim();
  if (trimmedName.length < 1 || trimmedName.length > 30) {
    return NextResponse.json(
      { error: "Name must be 1-30 characters" },
      { status: 400 }
    );
  }

  const quiz = getQuizByCode(code.trim());
  if (!quiz) {
    return NextResponse.json({ error: "Invalid quiz code" }, { status: 404 });
  }

  if (quiz.status === "finished") {
    return NextResponse.json(
      { error: "This quiz has already ended" },
      { status: 400 }
    );
  }

  const existing = getTeamByNameAndQuiz(quiz.id, trimmedName);
  if (existing) {
    return NextResponse.json(
      { error: "Name already taken for this quiz" },
      { status: 409 }
    );
  }

  const sessionToken = nanoid(32);
  const team = createTeam(quiz.id, trimmedName, sessionToken);
  await setTeamSessionCookie(sessionToken);

  const allTeams = getTeamsByQuiz(quiz.id);
  broadcast(quiz.id, "team:joined", {
    teamName: trimmedName,
    teamCount: allTeams.length,
  });

  return NextResponse.json({
    quizId: quiz.id,
    teamId: team.id,
    quizTitle: quiz.title,
  });
}
