"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuizSSE } from "@/hooks/use-quiz-sse";

interface RankEntry {
  rank: number;
  teamId: string;
  name: string;
  score: number;
  correctCount: number;
}

interface QuestionInfo {
  questionIdx: number;
  totalQuestions: number;
  text: string;
}

export default function LiveLeaderboardPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [leaderboard, setLeaderboard] = useState<RankEntry[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [quizStatus, setQuizStatus] = useState<string>("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionInfo | null>(null);
  const [showPodium, setShowPodium] = useState(false);

  const handleSSE = useCallback((event: string, data: unknown) => {
    const d = data as Record<string, unknown>;
    switch (event) {
      case "team:joined":
        setTeamCount(d.teamCount as number);
        break;
      case "quiz:started":
        setQuizStatus("active");
        break;
      case "question:active":
        setQuizStatus("active");
        setCurrentQuestion({
          questionIdx: d.questionIdx as number,
          totalQuestions: d.totalQuestions as number,
          text: d.text as string,
        });
        break;
      case "question:revealed":
        setQuizStatus("revealed");
        if (d.leaderboard) setLeaderboard(d.leaderboard as RankEntry[]);
        break;
      case "leaderboard:update":
        if (d.rankings) setLeaderboard(d.rankings as RankEntry[]);
        break;
      case "quiz:ended":
        setQuizStatus("finished");
        if (d.finalRankings) setLeaderboard(d.finalRankings as RankEntry[]);
        setTimeout(() => setShowPodium(true), 500);
        break;
    }
  }, []);

  useQuizSSE(quizId, handleSSE);

  // Podium view for finished quiz
  if (showPodium && leaderboard.length > 0) {
    const top3 = leaderboard.slice(0, 3);
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
    const podiumHeights = ["h-40", "h-56", "h-32"];
    const podiumColors = [
      "bg-zinc-400",
      "bg-amber-500",
      "bg-amber-700",
    ];
    const medals = ["\u{1F948}", "\u{1F947}", "\u{1F949}"];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 mb-2">
          Final Results
        </h1>
        <p className="text-zinc-400 mb-12">Quiz Complete</p>

        <div className="flex items-end justify-center gap-4 mb-12">
          {podiumOrder.map((entry, i) => (
            <div
              key={entry.teamId}
              className="flex flex-col items-center animate-podium-rise"
              style={{ animationDelay: `${(2 - i) * 0.3}s`, animationFillMode: "backwards" }}
            >
              <div className="text-3xl mb-2">{medals[i]}</div>
              <div className="text-base font-semibold text-zinc-50 mb-1 text-center px-2">{entry.name}</div>
              <div className="text-zinc-200 font-semibold text-lg mb-3">
                {entry.score.toLocaleString()}
              </div>
              <div
                className={`w-32 sm:w-40 ${podiumHeights[i]} ${podiumColors[i]} rounded-t-xl flex items-start justify-center pt-4`}
              >
                <span className="text-2xl font-bold text-white/70">
                  #{entry.rank}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Rest of rankings */}
        {leaderboard.length > 3 && (
          <div className="w-full max-w-lg space-y-2">
            {leaderboard.slice(3, 10).map((entry) => (
              <div
                key={entry.teamId}
                className="flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl animate-slide-up"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-500 w-8">#{entry.rank}</span>
                  <span className="font-medium">{entry.name}</span>
                </div>
                <span className="font-semibold text-zinc-50">{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-10 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50">
          Quiz Battle
        </h1>
        {currentQuestion && (
          <p className="text-zinc-400 mt-2">
            Question {currentQuestion.questionIdx + 1} of {currentQuestion.totalQuestions}
          </p>
        )}
      </div>

      {/* Waiting state */}
      {quizStatus === "waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse mb-6"></div>
          <p className="text-xl text-zinc-400 mb-2">Waiting for players...</p>
          <p className="text-4xl font-bold text-zinc-50">{teamCount}</p>
          <p className="text-zinc-500">players joined</p>
        </div>
      )}

      {/* Active/Revealed: show leaderboard */}
      {(quizStatus === "active" || quizStatus === "revealed") && (
        <div className="flex-1 max-w-2xl mx-auto w-full">
          {/* Current question display */}
          {currentQuestion && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6 text-center">
              <div className="text-sm text-zinc-400 mb-2">
                Q{currentQuestion.questionIdx + 1}/{currentQuestion.totalQuestions}
              </div>
              <div className="text-xl sm:text-2xl font-medium">{currentQuestion.text}</div>
            </div>
          )}

          {/* Rankings */}
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <p className="text-lg">Waiting for answers...</p>
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <div
                  key={entry.teamId}
                  className="flex items-center justify-between px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-xl transition-all duration-500 animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xl font-bold w-10 ${
                      entry.rank === 1 ? "text-amber-400" :
                      entry.rank === 2 ? "text-zinc-300" :
                      entry.rank === 3 ? "text-amber-700" :
                      "text-zinc-500"
                    }`}>
                      #{entry.rank}
                    </span>
                    <div>
                      <div className="font-medium text-lg">{entry.name}</div>
                      <div className="text-xs text-zinc-500">
                        {entry.correctCount} correct
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-zinc-50">
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
