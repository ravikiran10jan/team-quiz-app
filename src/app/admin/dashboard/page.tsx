"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  code: string;
  status: string;
  timePerQuestion: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [timePerQ, setTimePerQ] = useState(20);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchQuizzes = async () => {
    const res = await fetch("/api/admin/quizzes");
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    const data = await res.json();
    setQuizzes(data);
  };

  useEffect(() => {
    fetchQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), timePerQuestion: timePerQ }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewTitle("");
        router.push(`/admin/quiz/${data.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quiz and all its data?")) return;
    await fetch(`/api/admin/quiz/${id}`, { method: "DELETE" });
    fetchQuizzes();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return "bg-correct/10 text-correct border border-correct/20";
      default: return "bg-surface-overlay text-text-muted border border-white/[0.06]";
    }
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Link href="/" className="text-text-muted hover:text-text-primary text-sm transition-colors">
          &larr; Home
        </Link>
      </div>

      {/* Create new quiz */}
      <form
        onSubmit={handleCreate}
        className="card p-6 mb-8"
      >
        <h2 className="text-lg font-medium mb-4">Create New Quiz</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Quiz title..."
            className="flex-1 px-4 py-3 bg-surface-overlay border border-white/[0.08] rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/30 transition-colors"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary whitespace-nowrap">Time/Q:</label>
            <select
              value={timePerQ}
              onChange={(e) => setTimePerQ(Number(e.target.value))}
              className="px-3 py-3 bg-surface-overlay border border-white/[0.08] rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 transition-colors"
            >
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            + Create
          </button>
        </div>
      </form>

      {/* Quiz list */}
      <div className="space-y-3">
        {quizzes.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p>No quizzes yet. Create one above!</p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-lg truncate">{quiz.title}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadge(quiz.status)}`}>
                    {quiz.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>
                    Code: <span className="font-mono text-accent font-medium">{quiz.code}</span>
                  </span>
                  <span>{quiz.timePerQuestion}s per question</span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => router.push(`/admin/quiz/${quiz.id}`)}
                  className="px-4 py-2 bg-surface-overlay hover:bg-white/[0.08] border border-white/[0.06] rounded-lg text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => router.push(`/admin/quiz/${quiz.id}/control`)}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors"
                >
                  Control
                </button>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  className="px-4 py-2 bg-wrong/10 hover:bg-wrong/15 border border-wrong/20 rounded-lg text-sm font-medium transition-colors text-wrong"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
