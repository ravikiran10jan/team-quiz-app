"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuizSSE } from "@/hooks/use-quiz-sse";
import { useQuizStore } from "@/stores/quiz-store";
import { useCountdown } from "@/hooks/use-countdown";

// ─── Option Color Themes (Kahoot-style per-option) ───
const OPTION_THEMES = [
  { bg: "bg-option-a/8", border: "border-option-a/20", hoverBorder: "hover:border-option-a/40", selectedBg: "bg-option-a/15", selectedBorder: "border-option-a/50", ring: "ring-option-a/20", badgeBg: "bg-option-a/20", badgeText: "text-option-a" },
  { bg: "bg-option-b/8", border: "border-option-b/20", hoverBorder: "hover:border-option-b/40", selectedBg: "bg-option-b/15", selectedBorder: "border-option-b/50", ring: "ring-option-b/20", badgeBg: "bg-option-b/20", badgeText: "text-option-b" },
  { bg: "bg-option-c/8", border: "border-option-c/20", hoverBorder: "hover:border-option-c/40", selectedBg: "bg-option-c/15", selectedBorder: "border-option-c/50", ring: "ring-option-c/20", badgeBg: "bg-option-c/20", badgeText: "text-option-c" },
  { bg: "bg-option-d/8", border: "border-option-d/20", hoverBorder: "hover:border-option-d/40", selectedBg: "bg-option-d/15", selectedBorder: "border-option-d/50", ring: "ring-option-d/20", badgeBg: "bg-option-d/20", badgeText: "text-option-d" },
];

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
    fraction > 0.5 ? "text-text-primary" : fraction > 0.2 ? "text-warning" : "text-wrong";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--color-surface-overlay)" strokeWidth="6" />
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
          className={`${color} transition-[stroke-dashoffset] duration-100`}
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
    <div className="inline-flex items-center gap-1 px-3 py-1 bg-warning/10 border border-warning/20 rounded-full">
      <span className="text-warning font-medium text-sm">&times;{streak} streak</span>
    </div>
  );
}

// ─── Lobby Phase ───
function LobbyView({ playerName, playerCount, quizTitle }: { playerName: string; playerCount: number; quizTitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">{quizTitle}</h1>
      <p className="text-text-secondary text-sm mb-8">Waiting for the host to start...</p>

      <div className="card p-6 mb-4 w-full max-w-sm">
        <p className="text-text-muted text-xs uppercase tracking-wide">You</p>
        <p className="text-xl font-semibold text-accent">{playerName}</p>
      </div>

      <div className="card p-6 w-full max-w-sm">
        <p className="text-text-muted text-xs uppercase tracking-wide">Players Joined</p>
        <p className="text-3xl font-bold text-text-primary">{playerCount}</p>
      </div>

      <span className="mt-8 text-text-muted text-sm animate-pulse">Waiting for host to start...</span>
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

  const getOptionStyle = (optionId: string, idx: number) => {
    const theme = OPTION_THEMES[idx % 4];

    // Revealed state
    if (feedback || correctOptionId) {
      if (optionId === (feedback?.correctOptionId ?? correctOptionId)) {
        return "bg-correct/15 border-correct text-correct";
      }
      if (optionId === selectedOptionId && !feedback?.correct) {
        return "bg-wrong/10 border-wrong/40 text-text-secondary animate-shake";
      }
      return "bg-surface-overlay border-transparent opacity-30";
    }
    // Selected (pre-reveal)
    if (optionId === selectedOptionId) {
      return `${theme.selectedBg} ${theme.selectedBorder} ring-2 ${theme.ring} text-text-primary`;
    }
    // Default — each option has its own color
    return `${theme.bg} ${theme.border} ${theme.hoverBorder} text-text-primary`;
  };

  const getBadgeStyle = (optionId: string, idx: number) => {
    const theme = OPTION_THEMES[idx % 4];

    if (feedback || correctOptionId) {
      if (optionId === (feedback?.correctOptionId ?? correctOptionId)) {
        return "bg-correct/20 text-correct";
      }
      if (optionId === selectedOptionId && !feedback?.correct) {
        return "bg-wrong/20 text-wrong";
      }
      return "bg-surface-overlay text-text-muted";
    }
    if (optionId === selectedOptionId) {
      return `${theme.badgeBg} ${theme.badgeText}`;
    }
    return `${theme.badgeBg} ${theme.badgeText}`;
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
      {showConfetti && <ConfettiExplosion />}

      {/* Header: score, streak, timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-left">
          <div className="text-xs text-text-muted uppercase tracking-wide">Score</div>
          <div className="text-lg font-semibold text-text-primary">{totalScore.toLocaleString()}</div>
        </div>
        <TimerRing fraction={fraction} timeLeft={timeLeft} />
        <div className="text-right">
          <StreakBadge streak={streak} />
          <div className="text-sm text-text-secondary mt-1">
            Q{currentQuestion.questionIdx + 1}/{currentQuestion.totalQuestions}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-overlay rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-[width] duration-300"
          style={{
            width: `${((currentQuestion.questionIdx + 1) / currentQuestion.totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Question text */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-medium text-text-primary text-center leading-relaxed">
          {currentQuestion.text}
        </h2>
      </div>

      {/* Options — each with distinct color, fixed double-click */}
      <div className="grid grid-cols-1 gap-3 flex-1">
        {currentQuestion.options.map((opt, idx) => (
          <button
            key={opt.id}
            onClick={() => handleSelectOption(opt.id)}
            disabled={!!selectedOptionId || !!feedback || isExpired || submitting}
            className={`relative w-full py-4 px-5 rounded-xl text-left font-medium text-base border transition-colors duration-150 touch-manipulation disabled:cursor-default ${getOptionStyle(opt.id, idx)}`}
          >
            <span className={`mr-3 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold ${getBadgeStyle(opt.id, idx)}`}>
              {String.fromCharCode(65 + idx)}
            </span>
            {opt.text}
          </button>
        ))}
      </div>

      {/* Feedback banner — correct */}
      {feedback && feedback.correct && (
        <div className="mt-4 animate-scale-in">
          <div className="relative rounded-xl bg-correct/10 border border-correct/20 p-5">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-correct/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-correct" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-correct">Correct!</div>
                <div className="text-text-secondary text-sm">
                  +{feedback.pointsAwarded.toLocaleString()} points
                  {feedback.speedBonus > 0 && (
                    <span className="text-text-muted ml-2">(+{feedback.speedBonus} speed bonus)</span>
                  )}
                </div>
              </div>
              <div className="text-2xl font-bold text-correct shrink-0">
                +{feedback.pointsAwarded.toLocaleString()}
              </div>
            </div>
            {pointsFly !== null && (
              <div className="absolute right-5 -top-6 text-xl font-bold text-correct animate-points-fly pointer-events-none">
                +{pointsFly.toLocaleString()}
              </div>
            )}
          </div>
          {phase !== "revealed" && (
            <div className="text-text-muted text-xs text-center mt-3">Waiting for next question...</div>
          )}
        </div>
      )}

      {/* Feedback banner — incorrect */}
      {feedback && !feedback.correct && (
        <div className="mt-4 animate-scale-in">
          <div className="rounded-xl bg-wrong/10 border border-wrong/20 p-5">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-wrong/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-wrong" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-wrong">Incorrect</div>
                <div className="text-text-secondary text-sm">
                  The correct answer is highlighted above
                </div>
              </div>
              <div className="text-2xl font-bold text-wrong/60 shrink-0">
                +0
              </div>
            </div>
          </div>
          {phase !== "revealed" && (
            <div className="text-text-muted text-xs text-center mt-3">Waiting for next question...</div>
          )}
        </div>
      )}

      {/* Time expired without answer */}
      {isExpired && !feedback && !selectedOptionId && (
        <div className="mt-4 animate-scale-in">
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-5">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="9" fill="none" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-warning">Time&apos;s Up!</div>
                <div className="text-text-secondary text-sm">No answer submitted</div>
              </div>
            </div>
          </div>
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
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Quiz Complete!</h1>
      <p className="text-text-secondary mb-6">{teamName}</p>

      <div className="card p-8 mb-6 w-full max-w-sm">
        <div className="text-sm text-text-secondary mb-1">Your Score</div>
        <div className="text-4xl font-bold text-text-primary">
          {totalScore.toLocaleString()}
        </div>
        {myRank && (
          <div className="mt-4">
            <div className="text-base text-text-secondary">
              Rank <span className="font-semibold text-text-primary">#{myRank.rank}</span> of {leaderboard.length}
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
        <div className="text-text-secondary animate-pulse">Loading...</div>
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
