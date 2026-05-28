import type { OptionValue, Questionnaire } from "../core/types";
import type { ScoreMetric, ScoreOutcome } from "../core/scoring";
import { incomplete, missingCount, percentDisplay, questionsOf, sumNumeric } from "./helpers";

const ZURICH_GROUPS = [
  {
    key: "symptom_severity",
    label_ar: "Symptom severity",
    questionIndexes: [0, 1, 2, 3, 4, 5],
    denominator: 30,
  },
  {
    key: "physical_function",
    label_ar: "Physical function",
    questionIndexes: [7, 8, 9, 10],
    denominator: 16,
  },
  {
    key: "patient_satisfaction",
    label_ar: "Patient satisfaction",
    questionIndexes: [12, 13, 14, 15, 16],
    denominator: 20,
  },
] as const;

export function scoreZurich(q: Questionnaire, answers: Record<string, OptionValue>): ScoreOutcome {
  const questions = questionsOf(q);
  const requiredIds = ZURICH_GROUPS.flatMap((group) =>
    group.questionIndexes.map((index) => questions[index]?.id).filter((id): id is string => Boolean(id)),
  );
  const missing = missingCount(requiredIds, answers);
  if (missing) return incomplete(missing);

  const metrics: ScoreMetric[] = ZURICH_GROUPS.map((group) => {
    const ids = group.questionIndexes
      .map((index) => questions[index]?.id)
      .filter((id): id is string => Boolean(id));
    const raw = sumNumeric(ids, answers);
    const score = (raw / group.denominator) * 100;
    return {
      key: group.key,
      label_ar: group.label_ar,
      value: score,
      display_ar: percentDisplay(score),
    };
  });

  return {
    status: "ready",
    metrics,
    direction_ar: "For all Zurich subscores: lower = better, higher = worse.",
    note_ar:
      "Zurich reports 3 separate subscores only. Symptoms = raw / 30 × 100, Physical function = raw / 16 × 100, Satisfaction = raw / 20 × 100.",
  };
}
