"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/quiz/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), teamName: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join");
        return;
      }

      router.push(`/play/${data.quizId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-option-d/[0.04] blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Hero section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Live Quiz
          </div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            Quiz Battle
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Enter your name and code to join the game
          </p>
        </div>

        {/* Form card */}
        <div className="card p-6">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-text-secondary mb-1.5">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={30}
                required
                className="w-full px-4 py-3 bg-surface-base border border-white/[0.08] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 text-base transition-colors"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-text-secondary mb-1.5">
                Quiz Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="QUIZ7K"
                maxLength={6}
                required
                className="w-full px-4 py-3 bg-surface-base border border-white/[0.08] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 text-lg tracking-[0.3em] text-center font-mono uppercase transition-colors"
              />
            </div>

            {error && (
              <div className="bg-wrong/10 border border-wrong/20 text-wrong px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Quiz"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/admin"
            className="text-text-muted hover:text-text-secondary text-sm transition-colors"
          >
            Admin Access &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
