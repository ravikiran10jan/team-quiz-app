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
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-option-d/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[250px] h-[250px] rounded-full bg-option-b/[0.03] blur-[80px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Hero */}
        <div className="text-center mb-6">
          {/* Logo icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/15 border border-accent/20 mb-4">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            Quiz Battle
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Real-time multiplayer quiz &mdash; compete live!
          </p>
        </div>

        {/* Form card */}
        <div className="card p-6 mb-6">
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
                placeholder="Enter code shared by your admin"
                maxLength={10}
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

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-raised/60 border border-white/[0.04]">
            <div className="w-9 h-9 rounded-lg bg-option-a/10 flex items-center justify-center mb-2">
              <svg className="w-[18px] h-[18px] text-option-a" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-text-secondary">Real-time</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-raised/60 border border-white/[0.04]">
            <div className="w-9 h-9 rounded-lg bg-option-b/10 flex items-center justify-center mb-2">
              <svg className="w-[18px] h-[18px] text-option-b" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-text-secondary">Leaderboard</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-raised/60 border border-white/[0.04]">
            <div className="w-9 h-9 rounded-lg bg-option-c/10 flex items-center justify-center mb-2">
              <svg className="w-[18px] h-[18px] text-option-c" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-text-secondary">Multiplayer</span>
          </div>
        </div>

        <div className="text-center">
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
