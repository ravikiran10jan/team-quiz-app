import { create } from "zustand";

interface QuestionData {
  questionIdx: number;
  questionId: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  timeLimit: number;
  startedAt: string;
  totalQuestions: number;
}

interface RankEntry {
  rank: number;
  teamId: string;
  name: string;
  score: number;
  correctCount: number;
}

interface FeedbackData {
  correct: boolean;
  pointsAwarded: number;
  speedBonus: number;
  streak: number;
  streakMultiplier: number;
  correctOptionId: string;
}

type GamePhase = "lobby" | "question" | "feedback" | "revealed" | "finished";

interface QuizStore {
  phase: GamePhase;
  quizId: string | null;
  teamId: string | null;
  teamName: string | null;
  teamCount: number;
  currentQuestion: QuestionData | null;
  selectedOptionId: string | null;
  feedback: FeedbackData | null;
  streak: number;
  totalScore: number;
  leaderboard: RankEntry[];
  correctOptionId: string | null;

  setQuizInfo: (quizId: string, teamId: string, teamName: string) => void;
  setPhase: (phase: GamePhase) => void;
  setTeamCount: (count: number) => void;
  setCurrentQuestion: (q: QuestionData) => void;
  setSelectedOption: (optionId: string) => void;
  setFeedback: (f: FeedbackData) => void;
  setLeaderboard: (rankings: RankEntry[]) => void;
  setRevealedAnswer: (correctOptionId: string) => void;
  addScore: (points: number) => void;
  setStreak: (streak: number) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  phase: "lobby",
  quizId: null,
  teamId: null,
  teamName: null,
  teamCount: 0,
  currentQuestion: null,
  selectedOptionId: null,
  feedback: null,
  streak: 0,
  totalScore: 0,
  leaderboard: [],
  correctOptionId: null,

  setQuizInfo: (quizId, teamId, teamName) =>
    set({ quizId, teamId, teamName }),
  setPhase: (phase) => set({ phase }),
  setTeamCount: (teamCount) => set({ teamCount }),
  setCurrentQuestion: (q) =>
    set({
      currentQuestion: q,
      selectedOptionId: null,
      feedback: null,
      correctOptionId: null,
      phase: "question",
    }),
  setSelectedOption: (optionId) => set({ selectedOptionId: optionId }),
  setFeedback: (f) =>
    set({
      feedback: f,
      streak: f.streak,
      correctOptionId: f.correctOptionId,
      phase: "feedback",
    }),
  setLeaderboard: (rankings) => set({ leaderboard: rankings }),
  setRevealedAnswer: (correctOptionId) =>
    set({ correctOptionId, phase: "revealed" }),
  addScore: (points) =>
    set((state) => ({ totalScore: state.totalScore + points })),
  setStreak: (streak) => set({ streak }),
  reset: () =>
    set({
      phase: "lobby",
      currentQuestion: null,
      selectedOptionId: null,
      feedback: null,
      streak: 0,
      totalScore: 0,
      leaderboard: [],
      correctOptionId: null,
    }),
}));
