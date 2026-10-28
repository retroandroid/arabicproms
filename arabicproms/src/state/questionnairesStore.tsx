import React, { useEffect, useMemo, useState } from "react";
import type { Questionnaire } from "../core/types";
import { loadBuiltinQuestionnaires } from "../questionnaires/index";
import { loadUserQuestionnaires, saveUserQuestionnaires, upsert, removeById } from "../core/Storage";
import { QuestionnairesContext, type QEntry } from "./questionnairesContext";

export function QuestionnairesProvider({ children }: { children: React.ReactNode }) {
  const [builtins, setBuiltins] = useState<Questionnaire[]>([]);
  const [userQs, setUserQs] = useState<Questionnaire[]>(() => loadUserQuestionnaires());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadBuiltinQuestionnaires().then((loaded) => {
      if (!active) return;
      setBuiltins(loaded);
      setSelectedId((current) => current ?? loaded[0]?.id ?? null);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoadError("تعذر تحميل الاستبيانات. تحقق من الاتصال ثم أعد المحاولة.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [attempt]);

  const all: QEntry[] = useMemo(() => {
    // Built-ins take precedence so an older local import cannot hide updated questions.
    const builtinIds = new Set(builtins.map((q) => q.id));
    const list: QEntry[] = [
      ...builtins.map((q) => ({ q, source: "builtin" as const })),
      ...userQs.filter((q) => !builtinIds.has(q.id)).map((q) => ({ q, source: "user" as const })),
    ];
    list.sort((a, b) => a.q.title_ar.localeCompare(b.q.title_ar));
    return list;
  }, [builtins, userQs]);

  function addFromUser(incoming: Questionnaire[]) {
    const updated = upsert(userQs, incoming);
    setUserQs(updated);
    setStorageError(!saveUserQuestionnaires(updated));
    if (!selectedId && incoming.length) setSelectedId(incoming[0].id);
  }
  function removeUser(id: string) {
    const updated = removeById(userQs, id);
    setUserQs(updated);
    setStorageError(!saveUserQuestionnaires(updated));
    if (!builtins.some((q) => q.id === id)) setSelectedId((cur) => cur === id ? null : cur);
  }
  function retry() {
    setLoading(true);
    setLoadError(null);
    setAttempt((previous) => previous + 1);
  }

  return (
    <QuestionnairesContext.Provider value={{
      all, selectedId, select: setSelectedId, addFromUser, removeUser,
      loading, loadError, storageError, retry,
    }}>
      {children}
    </QuestionnairesContext.Provider>
  );
}
