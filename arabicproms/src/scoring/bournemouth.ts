import type { ScoreOutcome } from "../core/scoring";

export function scoreBournemouth(): ScoreOutcome {
  return {
    status: "unsupported",
    note_ar: "Bournemouth scoring rules missing. The uploaded Bournemouth document only includes the questionnaire title and no usable scoring details.",
  };
}
