import type { ProgressPayload } from "./types";

export const storageKey = (qid: string) => `qa_progress_${qid}`;

export function saveProgress(payload: ProgressPayload) {
  localStorage.setItem(storageKey(payload.qid), JSON.stringify(payload));
}

export function loadProgress(qid: string): ProgressPayload | null {
  const raw = localStorage.getItem(storageKey(qid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProgressPayload;
    if (!parsed || parsed.qid !== qid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProgress(qid: string) {
  localStorage.removeItem(storageKey(qid));
}