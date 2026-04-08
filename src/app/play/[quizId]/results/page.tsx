"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ResultData {
  teamName: string;
  totalScore: number;
  rank: number;
  totalTeams: number;
  leaderboard: Array<{
    rank: number;
    teamId: string;
    name: string;
    score: number;
    correctCount: number;
  }>;
}

export default function ResultsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}/state`);
        if (!res.ok) return;
        const data = await res.json();

        const myEntry = data.leaderboard?.find(
          (r: { teamId: string }) => r.teamId === data.teamId
        );
        setResult({
          teamName: data.teamName,
          totalScore: myEntry?.score ?? 0,
          rank: myEntry?.rank ?? 0,
          totalTeams: data.leaderboard?.length ?? 0,
          leaderboard: data.leaderboard ?? [],
        });
      } catch { /* ignore */ }
    };
    load();
  }, [quizId]);

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-secondary animate-pulse">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6 max-w-lg mx-auto w-full">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-1">Quiz Complete!</h1>
        <p className="text-text-secondary">{result.teamName}</p>
      </div>

      <div className="card p-8 mb-6 w-full text-center">
        <div className="text-sm text-text-secondary mb-1">Final Score</div>
        <div className="text-4xl font-bold text-text-primary">
          {result.totalScore.toLocaleString()}
        </div>
        <div className="mt-4 text-base text-text-secondary">
          Rank <span className="font-semibold text-text-primary">#{result.rank}</span> of {result.totalTeams}
        </div>
      </div>

      <div className="w-full space-y-2">
        <h2 className="text-sm font-medium text-text-secondary mb-2">Leaderboard</h2>
        {result.leaderboard.map((entry) => (
          <div
            key={entry.teamId}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              entry.name === result.teamName
                ? "bg-accent/10 border border-accent/20"
                : "card"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-muted w-6">#{entry.rank}</span>
              <span className="font-medium">{entry.name}</span>
            </div>
            <span className="font-semibold text-text-primary">{entry.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <Link
        href="/"
        className="mt-8 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
      >
        Play Again
      </Link>
    </div>
  );
}
