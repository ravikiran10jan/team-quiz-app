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
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-text-primary">
            Quiz Battle
          </h1>
          <p className="text-text-secondary text-sm mt-2">Enter your name and quiz code to join</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-text-secondary mb-1">
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
              className="w-full px-4 py-3 bg-surface-overlay border border-white/[0.08] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 text-lg transition-colors"
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-text-secondary mb-1">
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
              className="w-full px-4 py-3 bg-surface-overlay border border-white/[0.08] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 text-lg tracking-[0.3em] text-center font-mono uppercase transition-colors"
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
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Joining..." : "Join Quiz"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/admin"
            className="text-text-muted hover:text-text-primary text-sm transition-colors"
          >
            Admin Access &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
