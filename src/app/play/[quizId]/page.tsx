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

    const colors = ["#6366f1", "#34d399", "#38bdf8", "#fbbf24", "#a78bfa"];
    const particles = Array.from({ length: 35 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 15 - 5,
      size: Math.random() * 5 + 2,
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
    fraction > 0.5 ? "text-zinc-300" : fraction > 0.2 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="#27272a" strokeWidth="6" />
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
    <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
      <span className="text-amber-400 font-medium text-sm">&times;{streak} streak</span>
    </div>
  );
}

// ─── Lobby Phase ───
function LobbyView({ playerName, playerCount, quizTitle }: { playerName: string; playerCount: number; quizTitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 mb-2">{quizTitle}</h1>
      <p className="text-zinc-400 text-sm mb-8">Waiting for the host to start...</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-4 w-full max-w-sm">
        <p className="text-zinc-500 text-xs uppercase tracking-wide">You</p>
        <p className="text-xl font-semibold text-indigo-400">{playerName}</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
        <p className="text-zinc-500 text-xs uppercase tracking-wide">Players Joined</p>
        <p className="text-3xl font-bold text-zinc-50">{playerCount}</p>
      </div>

      <span className="mt-8 text-zinc-500 text-sm animate-pulse">Waiting for host to start...</span>
    </div>
  );
}

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

  const getOptionStyle = (optionId: string) => {
    // Revealed state
    if (feedback || correctOptionId) {
      if (optionId === (feedback?.correctOptionId ?? correctOptionId)) {
        return "bg-emerald-500/10 border-emerald-500 text-emerald-300";
      }
      if (optionId === selectedOptionId && !feedback?.correct) {
        return "bg-rose-500/10 border-rose-500/50 text-zinc-400 animate-shake";
      }
      return "bg-zinc-800/80 border-zinc-800 opacity-40";
    }
    // Selected (pre-reveal)
    if (optionId === selectedOptionId) {
      return "bg-indigo-500/10 border-indigo-500/50 text-zinc-100";
    }
    // Default
    return "bg-zinc-800/80 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-zinc-100";
  };

  const getBadgeStyle = (optionId: string) => {
    if (feedback || correctOptionId) {
      if (optionId === (feedback?.correctOptionId ?? correctOptionId)) {
        return "bg-emerald-500/20 text-emerald-400";
      }
      if (optionId === selectedOptionId && !feedback?.correct) {
        return "bg-rose-500/20 text-rose-400";
      }
    }
    if (optionId === selectedOptionId) {
      return "bg-indigo-500/20 text-indigo-400";
    }
    return "bg-zinc-700 text-zinc-400";
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
      {showConfetti && <ConfettiExplosion />}

      {/* Header: score, streak, timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-left">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Score</div>
          <div className="text-lg font-semibold text-zinc-50">{totalScore.toLocaleString()}</div>
        </div>
        <TimerRing fraction={fraction} timeLeft={timeLeft} />
        <div className="text-right">
          <StreakBadge streak={streak} />
          <div className="text-sm text-zinc-400 mt-1">
            Q{currentQuestion.questionIdx + 1}/{currentQuestion.totalQuestions}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{
            width: `${((currentQuestion.questionIdx + 1) / currentQuestion.totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Question text */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-medium text-zinc-50 text-center leading-relaxed">
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
            className={`relative w-full py-4 px-5 rounded-xl text-left font-medium text-base border transition-all duration-150 active:scale-[0.98] disabled:cursor-default ${getOptionStyle(opt.id)}`}
          >
            <span className={`mr-3 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold ${getBadgeStyle(opt.id)}`}>
              {String.fromCharCode(65 + idx)}
            </span>
            {opt.text}
          </button>
        ))}
      </div>

      {/* Feedback overlay */}
      {feedback && (
        <div className="mt-4 text-center animate-scale-in">
          <div
            className={`text-lg font-semibold ${feedback.correct ? "text-emerald-400" : "text-rose-400"}`}
          >
            {feedback.correct ? "Correct!" : "Incorrect"}
          </div>
          {feedback.correct && (
            <div className="relative">
              <div className="text-zinc-300 font-medium text-base">
                +{feedback.pointsAwarded.toLocaleString()} pts
              </div>
              {feedback.speedBonus > 0 && (
                <div className="text-sm text-zinc-500">
                  Speed bonus: +{feedback.speedBonus}
                </div>
              )}
              {pointsFly !== null && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-xl font-bold text-zinc-200 animate-points-fly pointer-events-none">
                  +{pointsFly.toLocaleString()}
                </div>
              )}
            </div>
          )}
          {phase !== "revealed" && (
            <div className="text-zinc-500 text-sm mt-2">Waiting for next question...</div>
          )}
        </div>
      )}

      {/* Time expired without answer */}
      {isExpired && !feedback && !selectedOptionId && (
        <div className="mt-4 text-center animate-scale-in">
          <div className="text-lg font-semibold text-rose-400">Time&apos;s Up!</div>
          <div className="text-zinc-500 text-sm mt-1">No answer submitted</div>
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
      <div className="text-3xl mb-3">&#127942;</div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 mb-2">Quiz Complete!</h1>
      <p className="text-zinc-400 mb-6">{teamName}</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 mb-6 w-full max-w-sm">
        <div className="text-sm text-zinc-400 mb-1">Your Score</div>
        <div className="text-4xl font-bold text-zinc-50">
          {totalScore.toLocaleString()}
        </div>
        {myRank && (
          <div className="mt-4">
            <span className="text-3xl">
              {myRank.rank === 1 ? "\u{1F947}" : myRank.rank === 2 ? "\u{1F948}" : myRank.rank === 3 ? "\u{1F949}" : ""}
            </span>
            <div className="text-base text-zinc-300">
              Rank <span className="font-semibold text-zinc-50">#{myRank.rank}</span> of {leaderboard.length}
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
                ? "bg-indigo-500/10 border border-indigo-500/20"
                : "bg-zinc-900 border border-zinc-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-500 w-6">#{entry.rank}</span>
              <span className="font-medium">{entry.name}</span>
            </div>
            <span className="font-semibold text-zinc-50">{entry.score.toLocaleString()}</span>
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
        <div className="text-zinc-400 animate-pulse">Loading...</div>
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
