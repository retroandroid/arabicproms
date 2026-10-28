import { createContext, useContext } from "react";
import type { Questionnaire, QuestionnaireSource } from "../core/types";

export type QEntry = { q: Questionnaire; source: QuestionnaireSource };
export type QuestionnairesStore = {
  all: QEntry[];
  selectedId: string | null;
  select: (id: string) => void;
  addFromUser: (incoming: Questionnaire[]) => void;
  removeUser: (id: string) => void;
  loading: boolean;
  loadError: string | null;
  storageError: boolean;
  retry: () => void;
};
export const QuestionnairesContext = createContext<QuestionnairesStore | null>(null);
export function useQuestionnairesStore() {
  const value = useContext(QuestionnairesContext);
  if (!value) throw new Error("QuestionnairesStore missing");
  return value;
}
