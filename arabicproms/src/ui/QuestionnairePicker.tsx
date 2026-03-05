import React from "react";
import { useQuestionnairesStore } from "../state/questionnairesStore";

export function QuestionnairePicker() {
  const { all, selectedId, select } = useQuestionnairesStore();

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {all.map(({ q, source }) => (
        <button
          key={`${source}:${q.id}`}
          onClick={() => select(q.id)}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background:
              selectedId === q.id ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
          }}
        >
          {q.title_ar || q.id}
        </button>
      ))}
    </div>
  );
}