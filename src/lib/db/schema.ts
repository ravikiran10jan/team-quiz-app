import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  code: text("code").notNull().unique(),
  status: text("status", { enum: ["draft", "active", "finished"] })
    .notNull()
    .default("draft"),
  timePerQuestion: integer("time_per_q").notNull().default(20),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  orderNum: integer("order_num").notNull(),
  timeLimitSec: integer("time_limit_sec").notNull().default(20),
  points: integer("points").notNull().default(1000),
});

export const options = sqliteTable("options", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  orderNum: integer("order_num").notNull(),
});

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  joinedAt: text("joined_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const responses = sqliteTable("responses", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  optionId: text("option_id"),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  timeTakenMs: integer("time_taken_ms").notNull(),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  streakAtTime: integer("streak_at_time").notNull().default(0),
  submittedAt: text("submitted_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const quizState = sqliteTable("quiz_state", {
  quizId: text("quiz_id")
    .primaryKey()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  currentQuestionIdx: integer("current_question_idx").notNull().default(-1),
  questionStartedAt: text("question_started_at"),
  status: text("status", {
    enum: ["waiting", "active", "revealed", "finished"],
  })
    .notNull()
    .default("waiting"),
});
