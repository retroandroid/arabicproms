import type { OptionValue, Questionnaire } from "../core/types";
import type { ScoreOutcome } from "../core/scoring";
import { scoreBournemouth } from "./bournemouth";
import { scoreEdinburgh } from "./edinburgh";
import { scoreQBS } from "./qbs";
import { scoreSFI } from "./sfi";
import { scoreZurich } from "./zurich";

type QuestionnaireScorer = (
  q: Questionnaire,
  answers: Record<string, OptionValue>,
) => ScoreOutcome;

const SCORERS: Partial<Record<string, QuestionnaireScorer>> = {
  Zurich: scoreZurich,
  Edinburgh: scoreEdinburgh,
  QBS: scoreQBS,
  SFI: scoreSFI,
  "Bournemouth Neck": scoreBournemouth,
};

export function scoreFromRegistry(
  q: Questionnaire,
  answers: Record<string, OptionValue>,
): ScoreOutcome | null {
  return SCORERS[q.id]?.(q, answers) ?? null;
}
