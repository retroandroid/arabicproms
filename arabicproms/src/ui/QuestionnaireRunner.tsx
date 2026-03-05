import React, { useMemo, useState } from "react";
import { useQuestionnairesStore } from "../state/questionnairesStore";
import type { QuestionItem } from "../core/types";

export function QuestionnaireRunner() {
  const { all, selectedId } = useQuestionnairesStore();
  const entry = useMemo(() => all.find((x) => x.q.id === selectedId), [all, selectedId]);
  const q = entry?.q;

  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (!q) return <div style={{ marginTop: 12 }}>اختر استبيانًا</div>;

  function setAnswer(qid: string, value: number) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  const totalQuestions = q.items.filter((x) => x.type === "question").length;
  const answered = Object.keys(answers).length;

  return (
    <div style={{ marginTop: 14 }}>
      <h2 style={{ margin: "8px 0 4px" }}>{q.title_ar}</h2>
      <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 10 }}>
        {answered} / {totalQuestions} تمّت الإجابة
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {q.items.map((item) => {
          if (item.type === "section") {
            return (
              <div key={item.id} style={{ marginTop: 12, fontWeight: 800, fontSize: 15 }}>
                {item.title_ar}
              </div>
            );
          }

          const qi = item as QuestionItem;
          const picked = answers[qi.id];

          return (
            <div
              key={qi.id}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div style={{ marginBottom: 10, lineHeight: 1.7 }}>{qi.text_ar}</div>

              <div style={{ display: "grid", gap: 8 }}>
                {qi.options.map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      background: picked === opt.value ? "rgba(255,255,255,0.07)" : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name={qi.id}
                      checked={picked === opt.value}
                      onChange={() => setAnswer(qi.id, opt.value)}
                    />
                    <span>{opt.label_ar}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        style={styles.finish}
        onClick={() => {
          console.log("RESULT:", { questionnaireId: q.id, answers });
          alert("تم حفظ الإجابات في الـ console ✅");
        }}
      >
        إنهاء
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  finish: {
    marginTop: 14,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
  },
};