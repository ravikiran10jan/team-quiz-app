"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
  orderNum: number;
}

interface Question {
  id?: string;
  text: string;
  orderNum: number;
  timeLimitSec: number;
  points: number;
  options: Option[];
}

interface Quiz {
  id: string;
  title: string;
  code: string;
  status: string;
  timePerQuestion: number;
  questions: Question[];
}

function emptyQuestion(orderNum: number, defaultTime: number): Question {
  return {
    text: "",
    orderNum,
    timeLimitSec: defaultTime,
    points: 1000,
    options: [
      { text: "", isCorrect: true, orderNum: 0 },
      { text: "", isCorrect: false, orderNum: 1 },
      { text: "", isCorrect: false, orderNum: 2 },
      { text: "", isCorrect: false, orderNum: 3 },
    ],
  };
}

export default function QuizEditorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/quiz/${quizId}`);
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setQuiz(data);
      if (data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions([emptyQuestion(0, data.timePerQuestion)]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const updateQuestion = (idx: number, updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...updates } : q))
    );
    setSaved(false);
  };

  const updateOption = (qIdx: number, oIdx: number, updates: Partial<Option>) => {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIdx
          ? {
              ...q,
              options: q.options.map((o, oi) => (oi === oIdx ? { ...o, ...updates } : o)),
            }
          : q
      )
    );
    setSaved(false);
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIdx
          ? {
              ...q,
              options: q.options.map((o, oi) => ({
                ...o,
                isCorrect: oi === oIdx,
              })),
            }
          : q
      )
    );
    setSaved(false);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      emptyQuestion(prev.length, quiz?.timePerQuestion ?? 20),
    ]);
    setSaved(false);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) =>
      prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderNum: i }))
    );
    setSaved(false);
  };

  const moveQuestion = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const updated = [...questions];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setQuestions(updated.map((q, i) => ({ ...q, orderNum: i })));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/quiz/${quizId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!quiz) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="text-zinc-500 hover:text-zinc-300 text-sm mb-2 inline-block transition-colors"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="text-xl font-semibold tracking-tight">{quiz.title}</h1>
          <p className="text-sm text-zinc-400">
            Code: <span className="font-mono text-indigo-400 font-medium">{quiz.code}</span>
            {" | "}{questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/quiz/${quizId}/control`)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            Go Live
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-zinc-400">
                Question {qIdx + 1}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveQuestion(qIdx, -1)}
                  disabled={qIdx === 0}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => moveQuestion(qIdx, 1)}
                  disabled={qIdx === questions.length - 1}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  &#9660;
                </button>
                <button
                  onClick={() => removeQuestion(qIdx)}
                  disabled={questions.length <= 1}
                  className="p-1.5 text-rose-400 hover:text-rose-300 disabled:opacity-30 ml-2 transition-colors"
                  title="Remove question"
                >
                  &#10005;
                </button>
              </div>
            </div>

            <textarea
              value={q.text}
              onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
              placeholder="Enter your question..."
              rows={2}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 mb-4 resize-none transition-colors"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <button
                    onClick={() => setCorrectOption(qIdx, oIdx)}
                    className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                      opt.isCorrect
                        ? "bg-emerald-600 border-emerald-400 text-white"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                    title={opt.isCorrect ? "Correct answer" : "Mark as correct"}
                  >
                    &#10003;
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) =>
                      updateOption(qIdx, oIdx, { text: e.target.value })
                    }
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <label className="text-zinc-400">Time:</label>
                <select
                  value={q.timeLimitSec}
                  onChange={(e) =>
                    updateQuestion(qIdx, { timeLimitSec: Number(e.target.value) })
                  }
                  className="px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
                >
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={20}>20s</option>
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-zinc-400">Points:</label>
                <select
                  value={q.points}
                  onChange={(e) =>
                    updateQuestion(qIdx, { points: Number(e.target.value) })
                  }
                  className="px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors"
                >
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value={1500}>1500</option>
                  <option value={2000}>2000</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={addQuestion}
          className="flex-1 py-3 border-2 border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 rounded-xl font-medium transition-colors"
        >
          + Add Question
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex-1 py-3 font-medium rounded-xl transition-all ${
            saved
              ? "bg-emerald-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-50`}
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Questions"}
        </button>
      </div>
    </div>
  );
}
