import type { OptionValue, QuestionItem, Questionnaire } from "../core/types";

export function questionsOf(q: Questionnaire): QuestionItem[] {
  return q.items.filter((item): item is QuestionItem => item.type === "question");
}

export function missingCount(questionIds: string[], answers: Record<string, OptionValue>): number {
  return questionIds.filter((id) => answers[id] === undefined).length;
}

export function incomplete(missing: number) {
  return {
    status: "incomplete" as const,
    missingCount: missing,
    note_ar: `أكمل ${missing} سؤال/أسئلة مطلوبة لحساب النتيجة.`,
  };
}

export function selectedLabel(
  question: QuestionItem | undefined,
  answers: Record<string, OptionValue>,
): string {
  if (!question) return "";
  const picked = answers[question.id];
  return question.options.find((option) => option.value === picked)?.label_ar.trim() ?? "";
}

export function numericAnswer(id: string, answers: Record<string, OptionValue>): number {
  const answer = answers[id];
  return typeof answer === "number" ? answer : 0;
}

export function sumNumeric(ids: string[], answers: Record<string, OptionValue>): number {
  return ids.reduce((sum, id) => sum + numericAnswer(id, answers), 0);
}

export function rawDisplay(value: number, max: number): string {
  return `${value} / ${max}`;
}

export function percentDisplay(value: number): string {
  return `${value.toFixed(1)} / 100`;
}
