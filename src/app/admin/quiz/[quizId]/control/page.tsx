"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuizSSE } from "@/hooks/use-quiz-sse";

interface QuizData {
  id: string;
  title: string;
  code: string;
  status: string;
  questions: Array<{
    id: string;
    text: string;
    orderNum: number;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
}

interface QuizStateData {
  quizId: string;
  currentQuestionIdx: number;
  questionStartedAt: string | null;
  status: "waiting" | "active" | "revealed" | "finished";
}

interface RankEntry {
  rank: number;
  teamId: string;
  name: string;
  score: number;
  correctCount: number;
}

export default function ControlPanelPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [state, setState] = useState<QuizStateData | null>(null);
  const [leaderboard, setLeaderboard] = useState<RankEntry[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/quiz/${quizId}`);
      if (res.status === 401) { router.push("/admin"); return; }
      if (!res.ok) return;
      const data = await res.json();
      setQuiz(data);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const handleAction = async (action: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/admin/quiz/${quizId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } finally {
      setActing(false);
    }
  };

  const handleSSE = useCallback((event: string, data: unknown) => {
    const d = data as Record<string, unknown>;
    switch (event) {
      case "team:joined":
        setTeamCount(d.teamCount as number);
        break;
      case "question:active":
        setState((prev) => prev ? {
          ...prev,
          status: "active",
          currentQuestionIdx: d.questionIdx as number,
          questionStartedAt: d.startedAt as string,
        } : {
          quizId: quizId,
          status: "active",
          currentQuestionIdx: d.questionIdx as number,
          questionStartedAt: d.startedAt as string,
        });
        break;
      case "question:revealed":
        setState((prev) => prev ? { ...prev, status: "revealed" } : prev);
        if (d.leaderboard) setLeaderboard(d.leaderboard as RankEntry[]);
        break;
      case "leaderboard:update":
        if (d.rankings) setLeaderboard(d.rankings as RankEntry[]);
        break;
      case "quiz:ended":
        setState((prev) => prev ? { ...prev, status: "finished" } : prev);
        if (d.finalRankings) setLeaderboard(d.finalRankings as RankEntry[]);
        break;
    }
  }, [quizId]);

  useQuizSSE(quizId, handleSSE);

  if (!quiz) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary animate-pulse">Loading...</div>
      </div>
    );
  }

  const currentIdx = state?.currentQuestionIdx ?? -1;
  const currentQuestion = currentIdx >= 0 ? quiz.questions[currentIdx] : null;
  const isLastQuestion = currentIdx >= quiz.questions.length - 1;
  const quizStatus = state?.status ?? "waiting";

  const statusBadge = () => {
    switch (quizStatus) {
      case "active": return "bg-correct/10 text-correct border border-correct/20";
      case "revealed": return "bg-warning/10 text-warning border border-warning/20";
      case "finished": return "bg-surface-overlay text-text-muted border border-white/[0.06]";
      default: return "bg-surface-overlay text-text-muted border border-white/[0.06]";
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="text-text-muted hover:text-text-primary text-sm mb-1 inline-block transition-colors"
          >
            &larr; Dashboard
          </button>
          <h1 className="text-xl font-semibold">{quiz.title}</h1>
          <div className="flex items-center gap-4 text-sm text-text-secondary mt-1">
            <span>Code: <span className="font-mono text-accent font-medium">{quiz.code}</span></span>
            <span>{teamCount} player{teamCount !== 1 ? "s" : ""} joined</span>
            <span>{quiz.questions.length} questions</span>
          </div>
        </div>
        <a
          href={`/quiz/${quizId}/live`}
          target="_blank"
          className="px-4 py-2 bg-surface-overlay hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-sm font-medium transition-colors"
        >
          Open Leaderboard &#8599;
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Quiz Control</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadge()}`}>
                {quizStatus}
              </span>
            </div>

            {/* Current question preview */}
            {currentQuestion && (
              <div className="bg-surface-overlay rounded-xl p-4 mb-4">
                <div className="text-sm text-text-secondary mb-1">
                  Question {currentIdx + 1} of {quiz.questions.length}
                </div>
                <div className="text-lg font-medium mb-3">{currentQuestion.text}</div>
                <div className="grid grid-cols-2 gap-2">
                  {currentQuestion.options.map((opt) => {
                    const showCorrect = opt.isCorrect && (quizStatus === "revealed" || quizStatus === "finished");
                    return (
                      <div
                        key={opt.id}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          showCorrect
                            ? "bg-correct/10 border border-correct/20 text-correct"
                            : "bg-surface-overlay border border-white/[0.06] text-text-muted"
                        }`}
                      >
                        {showCorrect && <span className="mr-1">&#10003;</span>}
                        {opt.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons — properly sized, NOT stretched */}
            <div className="flex flex-wrap gap-2">
              {quizStatus === "waiting" && (
                <button
                  onClick={() => handleAction("start")}
                  disabled={acting || quiz.questions.length === 0}
                  className="px-5 py-2.5 bg-correct hover:bg-correct/80 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  &#9654; Start Quiz
                </button>
              )}

              {quizStatus === "active" && (
                <button
                  onClick={() => handleAction("reveal")}
                  disabled={acting}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Reveal Answer
                </button>
              )}

              {quizStatus === "revealed" && !isLastQuestion && (
                <button
                  onClick={() => handleAction("next_question")}
                  disabled={acting}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Next Question &rarr;
                </button>
              )}

              {quizStatus === "revealed" && isLastQuestion && (
                <button
                  onClick={() => handleAction("end")}
                  disabled={acting}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  End Quiz
                </button>
              )}

              {quizStatus === "active" && (
                <button
                  onClick={() => handleAction("end")}
                  disabled={acting}
                  className="px-4 py-2 bg-wrong/10 hover:bg-wrong/15 border border-wrong/20 text-wrong text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  End Early
                </button>
              )}

              {quizStatus === "finished" && (
                <div className="py-4 text-text-secondary text-sm">
                  Quiz has ended. View the leaderboard for final results.
                </div>
              )}
            </div>
          </div>

          {/* Question progress */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Question Progress</h3>
            <div className="flex flex-wrap gap-2">
              {quiz.questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                    idx === currentIdx
                      ? "bg-accent text-white ring-2 ring-accent/30"
                      : idx < currentIdx
                      ? "bg-correct/10 text-correct border border-correct/20"
                      : "bg-surface-overlay text-text-muted"
                  }`}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard sidebar */}
        <div className="card p-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Live Rankings</h3>
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              Rankings will appear once players start answering
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.teamId}
                  className="flex items-center justify-between px-3 py-2 bg-surface-overlay/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-text-muted w-5 shrink-0">
                      #{entry.rank}
                    </span>
                    <span className="font-medium truncate text-sm">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-text-primary text-sm shrink-0 ml-2">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
