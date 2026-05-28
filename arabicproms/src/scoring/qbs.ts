import type { OptionValue, Questionnaire } from "../core/types";
import type { ScoreOutcome } from "../core/scoring";
import { incomplete, missingCount, questionsOf, rawDisplay, sumNumeric } from "./helpers";

export function scoreQBS(q: Questionnaire, answers: Record<string, OptionValue>): ScoreOutcome {
  const questions = questionsOf(q).slice(0, 20);
  const requiredIds = questions.map((question) => question.id);
  const missing = missingCount(requiredIds, answers);
  if (missing) return incomplete(missing);

  const raw = sumNumeric(requiredIds, answers);

  return {
    status: "ready",
    metrics: [
      {
        key: "qbs_score",
        label_ar: "QBS score",
        value: raw,
        display_ar: rawDisplay(raw, 100),
      },
    ],
    direction_ar: "Lower score = better health condition.",
    note_ar: "QBS final score = sum of all 20 answers. Maximum raw score is already 100.",
  };
}
