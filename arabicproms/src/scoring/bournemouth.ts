import type { OptionValue, Questionnaire } from "../core/types";
import type { ScoreOutcome } from "../core/scoring";
import { incomplete, missingCount, percentDisplay, questionsOf, sumNumeric } from "./helpers";

export function scoreBournemouth(
  q: Questionnaire,
  answers: Record<string, OptionValue>,
): ScoreOutcome {
  const questions = questionsOf(q).slice(0, 7);
  const requiredIds = questions.map((question) => question.id);
  const missing = missingCount(requiredIds, answers);
  if (missing) return incomplete(missing);

  const raw = sumNumeric(requiredIds, answers);
  const score = (raw / 70) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "bournemouth_neck_score",
        label_ar: "Bournemouth Neck score",
        value: score,
        display_ar: percentDisplay(score),
      },
    ],
    direction_ar: "Lower score = better condition. Higher score = worse condition.",
    note_ar: `Raw score used: ${raw} / 70.`,
  };
}
