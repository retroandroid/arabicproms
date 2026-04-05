import React, { useEffect, useMemo, useState } from "react";
import { useQuestionnairesStore } from "../state/questionnairesStore";
import type { OptionValue, QuestionItem } from "../core/types";
import { scoreQuestionnaire, type ScoreOutcome } from "../core/scoring";

export function QuestionnaireRunner() {
  const { all, selectedId } = useQuestionnairesStore();
  const entry = useMemo(() => all.find((x) => x.q.id === selectedId), [all, selectedId]);
  const q = entry?.q;

  const [answers, setAnswers] = useState<Record<string, OptionValue>>({});
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setAnswers({});
    setShowResult(false);
  }, [q?.id]);

  const score = useMemo(
    () => (q ? scoreQuestionnaire(q, answers) : null),
    [answers, q],
  );

  if (!q) return <div style={{ marginTop: 12 }}>اختر استبيانًا</div>;

  function setAnswer(qid: string, value: OptionValue) {
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
                    key={String(opt.value)}
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
          setShowResult(true);
        }}
      >
        احسب النتيجة
      </button>

      {showResult && score ? <ResultsPanel outcome={score} /> : null}
    </div>
  );
}

function ResultsPanel({ outcome }: { outcome: ScoreOutcome }) {
  return (
    <div style={styles.resultCard}>
      <div style={styles.resultTitle}>النتيجة</div>

      {outcome.status === "ready" ? (
        <>
          <div style={styles.direction}>{outcome.direction_ar}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {outcome.metrics.map((metric) => (
              <div key={metric.key} style={styles.metricRow}>
                <div style={styles.metricLabel}>{metric.label_ar}</div>
                <div style={styles.metricValue}>{metric.display_ar}</div>
              </div>
            ))}
          </div>
          {outcome.note_ar ? <div style={styles.note}>{outcome.note_ar}</div> : null}
        </>
      ) : null}

      {outcome.status === "incomplete" ? (
        <>
          <div style={styles.note}>{outcome.note_ar}</div>
          <div style={styles.direction}>الأسئلة الناقصة: {outcome.missingCount}</div>
        </>
      ) : null}

      {outcome.status === "unsupported" ? (
        <div style={styles.note}>{outcome.note_ar}</div>
      ) : null}
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
  resultCard: {
    marginTop: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
    background: "rgba(255,255,255,0.04)",
    display: "grid",
    gap: 10,
  },
  resultTitle: {
    fontWeight: 800,
    fontSize: 16,
  },
  direction: {
    opacity: 0.85,
    fontSize: 13,
  },
  metricRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  metricLabel: {
    lineHeight: 1.5,
  },
  metricValue: {
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  note: {
    lineHeight: 1.7,
    opacity: 0.9,
    fontSize: 14,
  },
};
