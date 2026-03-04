import type { Questionnaire } from "../types";

const KEY = "imported_questionnaires_v1";

export function loadImportedQuestionnaires(): Questionnaire[] | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Questionnaire[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveImportedQuestionnaires(qs: Questionnaire[]) {
  localStorage.setItem(KEY, JSON.stringify(qs));
}

export function clearImportedQuestionnaires() {
  localStorage.removeItem(KEY);
}