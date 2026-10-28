import type { Questionnaire } from "./types";
import { isQuestionnaire } from "./questionnaireValidation";

const KEY = "aqw_user_questionnaires_v1";

export function loadUserQuestionnaires(): Questionnaire[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? upsert([], data.filter(isQuestionnaire)) : [];
  } catch {
    return [];
  }
}

export function saveUserQuestionnaires(qs: Questionnaire[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(qs));
    return true;
  } catch {
    return false;
  }
}

export function upsert(existing: Questionnaire[], incoming: Questionnaire[]) {
  const map = new Map(existing.map((q) => [q.id, q]));
  for (const q of incoming) map.set(q.id, q);
  return Array.from(map.values());
}

export function removeById(existing: Questionnaire[], id: string) {
  return existing.filter((q) => q.id !== id);
}
