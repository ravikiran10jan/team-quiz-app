"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuizSSE } from "@/hooks/use-quiz-sse";
import { useQuizStore } from "@/stores/quiz-store";
import { useCountdown } from "@/hooks/use-countdown";

// ─── Confetti Component ───
function ConfettiExplosion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#ef4444"];
    const particles = Array.from({ length: 60 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 15 - 5,
      size: Math.random() * 8 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      life: 1,
    }));

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.rotation += p.rotSpeed;
        p.life -= 0.015;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (alive) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}

// ─── Timer Ring ───
function TimerRing({ fraction, timeLeft }: { fraction: number; timeLeft: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);
  const color =
    fraction > 0.5 ? "text-green-400" : fraction > 0.2 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#374151" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-100`}
        />
      </svg>
      <span className={`absolute text-2xl font-bold ${color}`}>{timeLeft}</span>
    </div>
  );
}

// ─── Streak Badge ───
function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-900/50 border border-amber-600 rounded-full animate-pulse-glow">
      <span className="text-lg">&#128293;</span>
      <span className="text-amber-300 font-bold">&times;{streak}</span>
    </div>
  );
}

// ─── Lobby Phase ───
function LobbyView({ playerName, playerCount, quizTitle }: { playerName: string; playerCount: number; quizTitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-6 animate-bounce">&#9889;</div>
      <h1 className="text-3xl font-bold mb-2">{quizTitle}</h1>
      <p className="text-gray-400 mb-8">Waiting for the host to start...</p>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6 w-full max-w-sm">
        <p className="text-gray-400 text-sm">You</p>
        <p className="text-2xl font-bold text-purple-400">{playerName}</p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
        <p className="text-gray-400 text-sm">Players Joined</p>
        <p className="text-4xl font-bold text-amber-400">{playerCount}</p>
      </div>

      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ─── Option button colors ───
const optionColors = [
  { bg: "bg-red-600 hover:bg-red-500", selected: "bg-red-700 ring-2 ring-red-300", correct: "bg-green-600", wrong: "bg-red-900" },
  { bg: "bg-blue-600 hover:bg-blue-500", selected: "bg-blue-700 ring-2 ring-blue-300", correct: "bg-green-600", wrong: "bg-blue-900" },
  { bg: "bg-yellow-600 hover:bg-yellow-500", selected: "bg-yellow-700 ring-2 ring-yellow-300", correct: "bg-green-600", wrong: "bg-yellow-900" },
  { bg: "bg-green-600 hover:bg-green-500", selected: "bg-green-700 ring-2 ring-green-300", correct: "bg-green-600", wrong: "bg-green-900" },
];

// ─── Question Phase ───
function QuestionView() {
  const {
    currentQuestion,
    selectedOptionId,
    feedback,
    correctOptionId,
    streak,
    totalScore,
    setSelectedOption,
    setFeedback,
    addScore,
    phase,
  } = useQuizStore();

  const { timeLeft, isExpired, fraction } = useCountdown(
    currentQuestion?.startedAt ?? null,
    currentQuestion?.timeLimit ?? 20
  );

  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pointsFly, setPointsFly] = useState<number | null>(null);
  const quizId = useQuizStore((s) => s.quizId);

  const handleSelectOption = async (optionId: string) => {
    if (selectedOptionId || feedback || isExpired || submitting) return;
    setSelectedOption(optionId);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/quiz/${quizId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion!.questionId,
          optionId,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback(data);
        if (data.correct) {
          addScore(data.pointsAwarded);
          setShowConfetti(true);
          setPointsFly(data.pointsAwarded);
          setTimeout(() => setShowConfetti(false), 2000);
          setTimeout(() => setPointsFly(null), 1200);
        }
      }
    } catch {
      // Network error, let player see they selected but no feedback
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentQuestion) return null;

  const getOptionStyle = (optionId: string, idx: number) => {
    const colors = optionColors[idx % 4];

    if (feedback || correctOptionId) {
      if (optionId === (feedback?.correctOptionId ?? correctOptionId)) {
        return `${colors.correct} ring-2 ring-green-300`;
      }
      if (optionId === selectedOptionId && !feedback?.correct) {
        return `${colors.wrong} ring-2 ring-red-400 animate-shake`;
      }
      return `${colors.bg} opacity-50`;
    }
    if (optionId === selectedOptionId) {
      return `${colors.selected} opacity-70`;
    }
    return colors.bg;
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
      {showConfetti && <ConfettiExplosion />}

      {/* Header: score, streak, timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-left">
          <div className="text-sm text-gray-400">Score</div>
          <div className="text-xl font-bold text-purple-400">{totalScore.toLocaleString()}</div>
        </div>
        <TimerRing fraction={fraction} timeLeft={timeLeft} />
        <div className="text-right">
          <StreakBadge streak={streak} />
          <div className="text-sm text-gray-400 mt-1">
            Q{currentQuestion.questionIdx + 1}/{currentQuestion.totalQuestions}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
          style={{
            width: `${((currentQuestion.questionIdx + 1) / currentQuestion.totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Question text */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-bold text-center leading-relaxed">
          {currentQuestion.text}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3 flex-1">
        {currentQuestion.options.map((opt, idx) => (
          <button
            key={opt.id}
            onClick={() => handleSelectOption(opt.id)}
            disabled={!!selectedOptionId || !!feedback || isExpired}
            className={`relative w-full py-4 px-6 rounded-xl font-semibold text-lg text-white transition-all duration-200 active:scale-[0.97] disabled:cursor-default ${getOptionStyle(opt.id, idx)}`}
          >
            <span className="mr-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/20 text-sm font-bold">
              {String.fromCharCode(65 + idx)}
            </span>
            {opt.text}
          </button>
        ))}
      </div>

      {/* Feedback overlay */}
      {feedback && (
        <div className="mt-4 text-center">
          <div
            className={`text-2xl font-bold ${feedback.correct ? "text-green-400" : "text-red-400"}`}
          >
            {feedback.correct ? "Correct!" : "Wrong!"}
          </div>
          {feedback.correct && (
            <div className="relative">
              <div className="text-amber-400 font-bold text-lg">
                +{feedback.pointsAwarded.toLocaleString()} pts
              </div>
              {feedback.speedBonus > 0 && (
                <div className="text-sm text-gray-400">
                  Speed bonus: +{feedback.speedBonus}
                </div>
              )}
              {pointsFly !== null && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-3xl font-extrabold text-amber-300 animate-points-fly pointer-events-none">
                  +{pointsFly.toLocaleString()}
                </div>
              )}
            </div>
          )}
          {phase !== "revealed" && (
            <div className="text-gray-500 text-sm mt-2">Waiting for next question...</div>
          )}
        </div>
      )}

      {/* Time expired without answer */}
      {isExpired && !feedback && !selectedOptionId && (
        <div className="mt-4 text-center">
          <div className="text-2xl font-bold text-red-400">Time&apos;s Up!</div>
          <div className="text-gray-500 text-sm mt-1">No answer submitted</div>
        </div>
      )}
    </div>
  );
}

// ─── Finished Phase ───
function FinishedView() {
  const { totalScore, leaderboard, teamId, teamName } = useQuizStore();
  const myRank = leaderboard.find((r) => r.teamId === teamId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">&#127942;</div>
      <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
      <p className="text-gray-400 mb-6">{teamName}</p>

      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 mb-6 w-full max-w-sm">
        <div className="text-sm text-gray-400 mb-1">Your Score</div>
        <div className="text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {totalScore.toLocaleString()}
        </div>
        {myRank && (
          <div className="mt-4">
            <span className="text-6xl">
              {myRank.rank === 1 ? "\u{1F947}" : myRank.rank === 2 ? "\u{1F948}" : myRank.rank === 3 ? "\u{1F949}" : ""}
            </span>
            <div className="text-lg text-gray-300">
              Rank <span className="font-bold text-amber-400">#{myRank.rank}</span> of {leaderboard.length}
            </div>
          </div>
        )}
      </div>

      {/* Mini leaderboard */}
      <div className="w-full max-w-sm space-y-2">
        {leaderboard.slice(0, 5).map((entry) => (
          <div
            key={entry.teamId}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              entry.teamId === teamId
                ? "bg-purple-900/50 border border-purple-600"
                : "bg-gray-800/50 border border-gray-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-400 w-6">#{entry.rank}</span>
              <span className="font-medium">{entry.name}</span>
            </div>
            <span className="font-bold text-amber-400">{entry.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Player Page ───
export default function PlayPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const store = useQuizStore();
  const [quizTitle, setQuizTitle] = useState("Loading...");
  const [loading, setLoading] = useState(true);

  // Fetch initial state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}/state`);
        if (!res.ok) {
          window.location.href = "/";
          return;
        }
        const data = await res.json();
        store.setQuizInfo(quizId, data.teamId, data.teamName);
        store.setTeamCount(data.teamCount);
        store.setStreak(data.streak || 0);
        setQuizTitle(data.quiz.title);

        // Calculate existing score from leaderboard
        if (data.leaderboard) {
          store.setLeaderboard(data.leaderboard);
          const myEntry = data.leaderboard.find(
            (r: { teamId: string }) => r.teamId === data.teamId
          );
          if (myEntry) {
            store.addScore(myEntry.score - store.totalScore);
          }
        }

        // Resume into correct phase
        if (data.state?.status === "finished") {
          store.setPhase("finished");
        } else if (data.state?.status === "active" && data.currentQuestion) {
          if (data.alreadyAnswered) {
            store.setCurrentQuestion(data.currentQuestion);
            store.setFeedback({
              correct: data.previousResponse.isCorrect,
              pointsAwarded: data.previousResponse.pointsAwarded,
              speedBonus: 0,
              streak: data.streak || 0,
              streakMultiplier: 1,
              correctOptionId: data.previousResponse.optionId,
            });
          } else {
            store.setCurrentQuestion(data.currentQuestion);
          }
        } else if (data.state?.status === "revealed" && data.currentQuestion) {
          store.setCurrentQuestion(data.currentQuestion);
          store.setPhase("revealed");
        }
      } catch {
        // Redirect on error
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  // SSE event handler
  const handleSSE = useCallback(
    (event: string, data: unknown) => {
      const d = data as Record<string, unknown>;
      switch (event) {
        case "team:joined":
          store.setTeamCount(d.teamCount as number);
          break;
        case "question:active":
          store.setCurrentQuestion({
            questionIdx: d.questionIdx as number,
            questionId: d.questionId as string,
            text: d.text as string,
            options: d.options as Array<{ id: string; text: string }>,
            timeLimit: d.timeLimit as number,
            startedAt: d.startedAt as string,
            totalQuestions: d.totalQuestions as number,
          });
          break;
        case "question:revealed": {
          store.setRevealedAnswer(d.correctOptionId as string);
          const rankings = d.leaderboard as Array<{
            rank: number;
            teamId: string;
            name: string;
            score: number;
            correctCount: number;
          }>;
          if (rankings) store.setLeaderboard(rankings);
          break;
        }
        case "leaderboard:update": {
          const ranks = d.rankings as Array<{
            rank: number;
            teamId: string;
            name: string;
            score: number;
            correctCount: number;
          }>;
          if (ranks) store.setLeaderboard(ranks);
          break;
        }
        case "quiz:ended": {
          const finalRankings = d.finalRankings as Array<{
            rank: number;
            teamId: string;
            name: string;
            score: number;
            correctCount: number;
          }>;
          if (finalRankings) store.setLeaderboard(finalRankings);
          store.setPhase("finished");
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useQuizSSE(quizId, handleSSE);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-2xl text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {store.phase === "lobby" && (
        <LobbyView
          playerName={store.teamName || ""}
          playerCount={store.teamCount}
          quizTitle={quizTitle}
        />
      )}
      {(store.phase === "question" ||
        store.phase === "feedback" ||
        store.phase === "revealed") && <QuestionView key={store.currentQuestion?.questionId} />}
      {store.phase === "finished" && <FinishedView />}
    </div>
  );
}
