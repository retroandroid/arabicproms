import React, { useEffect, useMemo, useState } from "react";
import { useQuestionnairesStore } from "../state/questionnairesStore";
import type { OptionValue, QuestionItem } from "../core/types";
import { scoreQuestionnaire, type ScoreOutcome } from "../core/scoring";

const FULL_TITLES: Record<string, string> = {
  AOS: "Ankle Osteoarthritis Scale",
  BFS: "Bristol Foot Score",
  DHI: "Duruoz Hand Index",
  Edinburgh: "Edinburgh Claudication Questionnaire",
  FAAM: "Foot and Ankle Ability Measure",
  FAOS: "Foot and Ankle Outcome Score",
  HOOS: "Hip disability and Osteoarthritis Outcome Score",
  "HOOS-12": "Hip disability and Osteoarthritis Outcome Score - 12 items",
  "HOOS-JR": "Hip disability and Osteoarthritis Outcomes Score for Joint Replacement",
  "HOOS-PS": "Hip disability and Osteoarthritis Outcome Score - Physical Function Shortform",
  "iHOT-12": "International Hip Outcome Tool 12",
  "iHOT-33": "International Hip Outcome Tool 33",
  KOOS: "Knee injury and Osteoarthritis Outcome Score",
  "KOOS-12": "Knee injury and Osteoarthritis Outcome Score - 12 items",
  "KOOS-JR": "Knee injury and Osteoarthritis Outcomes Score for Joint Replacement",
  LLTQ: "Lower-Limb Tasks Questionnaire",
  MHQ: "Michigan Hand Questionnaire",
  PSS: "Penn Shoulder Score",
  QBS: "Quebec Back Pain Disability Scale",
  SFI: "Spine Functional Index",
  "SFI-10": "Spine Functional Index-10",
  Zurich: "Zurich Claudication Questionnaire",
  "Bournemouth Neck": "Neck Bournemouth Questionnaire",
};

function getDisplayTitle(id: string, fallback: string): string {
  const fullTitle = FULL_TITLES[id];
  if (!fullTitle) return fallback;
  return fullTitle.includes(id) ? fullTitle : `${id}: ${fullTitle}`;
}

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
  const title = getDisplayTitle(q.id, q.title_ar);

  return (
    <div style={{ marginTop: 14 }}>
      <h2 style={{ margin: "8px 0 4px", fontSize: 26, lineHeight: 1.35 }}>{title}</h2>
      <div style={{ opacity: 0.8, fontSize: 15, marginBottom: 10 }}>
        {answered} / {totalQuestions} تمّت الإجابة
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {q.items.map((item) => {
          if (item.type === "section") {
            return (
              <div key={item.id} style={{ marginTop: 12, fontWeight: 800, fontSize: 18, lineHeight: 1.5 }}>
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
              <div style={{ marginBottom: 12, lineHeight: 1.8, fontSize: 17 }}>{qi.text_ar}</div>

              <div style={{ display: "grid", gap: 8 }}>
                {qi.options.map((opt, optionIndex) => (
                  <label
                    key={`${qi.id}:${optionIndex}:${String(opt.value)}`}
                    onClick={() => setAnswer(qi.id, opt.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      background: picked === opt.value ? "rgba(255,255,255,0.07)" : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name={qi.id}
                      value={String(opt.value)}
                      checked={picked === opt.value}
                      onChange={() => setAnswer(qi.id, opt.value)}
                    />
                    <span style={{ fontSize: 16, lineHeight: 1.55 }}>{opt.label_ar}</span>
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

      {showResult && score ? (
        <ResultModal
          outcome={score}
          onClose={() => {
            setShowResult(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ResultModal({ outcome, onClose }: { outcome: ScoreOutcome; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      style={styles.modalOverlay}
      onClick={onClose}
    >
      <div style={styles.resultCard} onClick={(event) => event.stopPropagation()}>
        <div style={styles.resultHeader}>
          <div id="result-title" style={styles.resultTitle}>
            النتيجة
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose}>
            إغلاق
          </button>
        </div>

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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  finish: {
    marginTop: 14,
    padding: "11px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "grid",
    placeItems: "center",
    padding: 18,
    background: "rgba(5, 10, 20, 0.72)",
    backdropFilter: "blur(8px)",
  },
  resultCard: {
    width: "min(680px, 100%)",
    maxHeight: "min(760px, calc(100vh - 36px))",
    overflow: "auto",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 16,
    padding: 18,
    background: "rgba(18, 30, 52, 0.98)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
    display: "grid",
    gap: 12,
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultTitle: {
    fontWeight: 800,
    fontSize: 22,
  },
  closeButton: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.07)",
    color: "white",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 700,
  },
  direction: {
    opacity: 0.85,
    fontSize: 15,
    lineHeight: 1.7,
  },
  metricRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  metricLabel: {
    lineHeight: 1.6,
    fontSize: 16,
  },
  metricValue: {
    fontWeight: 800,
    whiteSpace: "nowrap",
    fontSize: 17,
  },
  note: {
    lineHeight: 1.7,
    opacity: 0.9,
    fontSize: 15,
  },
};
