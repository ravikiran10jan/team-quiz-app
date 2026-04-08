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
          <div className="text-6xl mb-4">&#9889;</div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            Quiz Battle
          </h1>
          <p className="text-gray-400 mt-2">Enter your name and quiz code to join</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-1">
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
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-1">
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
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg tracking-[0.3em] text-center font-mono uppercase"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/50 active:scale-[0.98]"
          >
            {loading ? "Joining..." : "Join Quiz"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/admin"
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Admin Access &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
