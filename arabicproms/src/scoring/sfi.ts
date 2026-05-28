import type { OptionValue, Questionnaire, QuestionItem } from "../core/types";
import type { ScoreOutcome } from "../core/scoring";
import { incomplete, missingCount, percentDisplay, questionsOf, selectedLabel } from "./helpers";

function isScoredSfiQuestion(question: QuestionItem): boolean {
  const labels = question.options.map((option) => option.label_ar.trim());
  return labels.includes("نعم") && labels.includes("جزئيًا") && labels.includes("لا");
}

function scoreAnswer(question: QuestionItem, answers: Record<string, OptionValue>): number | null {
  const label = selectedLabel(question, answers);
  if (label === "لا") return 0;
  if (label === "جزئيًا") return 1;
  if (label === "نعم") return 2;
  return null;
}

export function scoreSFI(q: Questionnaire, answers: Record<string, OptionValue>): ScoreOutcome {
  const scoredQuestions = questionsOf(q).filter(isScoredSfiQuestion).slice(0, 25);
  if (scoredQuestions.length < 25) {
    return {
      status: "unsupported",
      note_ar: "SFI scoring requires 25 scored Yes/Partly/No questions.",
    };
  }

  const requiredIds = scoredQuestions.map((question) => question.id);
  const missing = missingCount(requiredIds, answers);
  if (missing) return incomplete(missing);

  let raw = 0;
  for (const question of scoredQuestions) {
    const value = scoreAnswer(question, answers);
    if (value === null) {
      return {
        status: "unsupported",
        note_ar: "Could not match one SFI answer to No = 0, Partly = 1, Yes = 2.",
      };
    }
    raw += value;
  }

  const score = (raw / 50) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "sfi_score",
        label_ar: "SFI score",
        value: score,
        display_ar: percentDisplay(score),
      },
    ],
    direction_ar: "Lower score = better condition. Higher score = worse spine disability.",
    note_ar: `SFI score = raw score / 50 × 100. Raw score used: ${raw} / 50. The injury location/reason field is not scored.`,
  };
}
