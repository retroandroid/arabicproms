import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Questionnaire, QuestionnaireSource } from "../core/types";

import { loadBuiltinQuestionnaires } from "../questionnaires/index";

import {
  loadUserQuestionnaires,
  saveUserQuestionnaires,
  upsert,
  removeById,
} from "../core/Storage"; // or "../core/storage" depending on your filename

type QEntry = { q: Questionnaire; source: QuestionnaireSource };

type Store = {
  all: QEntry[];
  selectedId: string | null;
  select: (id: string) => void;

  addFromUser: (incoming: Questionnaire[]) => void;
  removeUser: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function useQuestionnairesStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("QuestionnairesStore missing");
  return v;
}

export function QuestionnairesProvider({ children }: { children: React.ReactNode }) {
  const [builtins, setBuiltins] = useState<Questionnaire[]>([]);
  const [userQs, setUserQs] = useState<Questionnaire[]>(() => loadUserQuestionnaires());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadBuiltinQuestionnaires().then((q) => {
      setBuiltins(q);
      if (!selectedId && q.length) setSelectedId(q[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveUserQuestionnaires(userQs);
  }, [userQs]);

  const all: QEntry[] = useMemo(() => {
    const list: QEntry[] = [
      ...builtins.map((q) => ({ q, source: "builtin" as const })),
      ...userQs.map((q) => ({ q, source: "user" as const })),
    ];
    list.sort((a, b) => a.q.title_ar.localeCompare(b.q.title_ar));
    return list;
  }, [builtins, userQs]);

  function select(id: string) {
    setSelectedId(id);
  }

  function addFromUser(incoming: Questionnaire[]) {
    setUserQs((prev) => upsert(prev, incoming));
    if (!selectedId && incoming.length) setSelectedId(incoming[0].id);
  }

  function removeUser(id: string) {
    setUserQs((prev) => removeById(prev, id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  return (
    <Ctx.Provider value={{ all, selectedId, select, addFromUser, removeUser }}>
      {children}
    </Ctx.Provider>
  );
}