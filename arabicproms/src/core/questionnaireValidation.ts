import type { Questionnaire } from "./types";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Imported and persisted data cross an untyped boundary before reaching the form.
export function isQuestionnaire(value: unknown): value is Questionnaire {
  if (!record(value) || !text(value.id) || !text(value.title_ar) || !Array.isArray(value.items)) return false;
  const ids = new Set<string>();
  let questions = 0;
  for (const item of value.items) {
    if (!record(item) || !text(item.id) || ids.has(item.id)) return false;
    ids.add(item.id);
    if (item.type === "section") {
      if (!text(item.title_ar)) return false;
    } else if (item.type === "question") {
      questions++;
      if (!text(item.text_ar) || !Array.isArray(item.options)) return false;
      if (item.input !== undefined) {
        if (!record(item.input) || item.input.type !== "number" ||
          typeof item.input.min !== "number" || !Number.isFinite(item.input.min) ||
          (item.input.step !== "any" && (typeof item.input.step !== "number" || !Number.isFinite(item.input.step) || item.input.step <= 0)) ||
          (item.input.max !== undefined && (typeof item.input.max !== "number" || !Number.isFinite(item.input.max) || item.input.max < item.input.min)) ||
          item.options.length !== 0) return false;
      } else if (item.options.length < 2) return false;
      const values = new Set<unknown>();
      for (const option of item.options) {
        if (!record(option) || !text(option.label_ar) ||
          !(text(option.value) || (typeof option.value === "number" && Number.isFinite(option.value))) ||
          values.has(option.value)) return false;
        values.add(option.value);
      }
    } else return false;
  }
  return questions > 0;
}

// Positional scoring must never run against a truncated or extended built-in form.
export const SCORED_QUESTION_COUNTS: Partial<Record<string, number>> = {
  AOS: 18, BFS: 16, "Bournemouth Neck": 7, CPGS: 7, DHI: 18, Edinburgh: 6,
  FAAM: 31, FAOS: 42, HOOS: 41, "HOOS-12": 12, "HOOS-JR": 6, "HOOS-PS": 5,
  "iHOT-12": 13, "iHOT-33": 34, "KOOS-12": 12, "KOOS-JR": 7,
  LLTQ: 40, MHQ: 62, PSS: 24, QBS: 20, SFI: 26, "SFI-10": 11, Zurich: 18,
};
