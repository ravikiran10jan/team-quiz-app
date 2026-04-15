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
  const { title, timePerQuestion, code } = await request.json();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  let customCode: string | undefined;
  if (code) {
    customCode = String(code).toUpperCase();
    if (!/^[A-Z0-9]{3,10}$/.test(customCode)) {
      return NextResponse.json(
        { error: "Code must be 3-10 alphanumeric characters" },
        { status: 400 }
      );
    }
  }

  try {
    const quiz = createQuiz(title, timePerQuestion ?? 20, customCode);
    return NextResponse.json(quiz, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "This code is already in use" },
        { status: 409 }
      );
    }
    throw err;
  }
}
