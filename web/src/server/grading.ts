import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import type { AnswerValue, QuestionShape } from "@/lib/paperLayout";
import { maxScore, scoreQuestion, type ScoringRules } from "@/lib/scoring";
import type { Tx } from "./db";
import { attemptAnswers, attempts, paperQuestions, papers } from "./db/schema";

type GradedQuestion = { seq: number; shape: QuestionShape; answerKey: AnswerValue | null };

export function grade(questions: GradedQuestion[], answers: Map<number, AnswerValue | null>, rules: ScoringRules) {
  let score = 0;
  const marks = new Map<number, { points: number; correct: boolean }>();
  for (const question of questions) {
    const mark = scoreQuestion(question.shape, question.answerKey, answers.get(question.seq), rules);
    marks.set(question.seq, mark);
    score += mark.points;
  }
  return { score: Math.round(score * 1000) / 1000, max: maxScore(questions.map((question) => question.shape), rules), marks };
}

export function loadAnswers(tx: Tx, attemptId: number) {
  const rows = tx.select({ seq: attemptAnswers.seq, value: attemptAnswers.value }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId)).all();
  return new Map(rows.map((row) => [row.seq, row.value]));
}

export function gradeAttempt(tx: Tx, attemptId: number, paperId: number) {
  const paper = tx.select({ scoring: papers.scoring }).from(papers).where(eq(papers.id, paperId)).get()!;
  const questions = tx.select({ seq: paperQuestions.seq, shape: paperQuestions.shape, answerKey: paperQuestions.answerKey }).from(paperQuestions).where(eq(paperQuestions.paperId, paperId)).all();
  return grade(questions, loadAnswers(tx, attemptId), paper.scoring);
}

// đáp án đổi sau khi đã có bài nộp thì chấm lại mọi bài đã nộp của đề đó
export function rescorePaper(tx: Tx, paperId: number) {
  const submitted = tx.select({ id: attempts.id }).from(attempts).where(and(eq(attempts.paperId, paperId), isNotNull(attempts.submittedAt))).all();
  for (const attempt of submitted) {
    const result = gradeAttempt(tx, attempt.id, paperId);
    tx.update(attempts).set({ score: result.score, maxScore: result.max }).where(eq(attempts.id, attempt.id)).run();
  }
  return submitted.length;
}
