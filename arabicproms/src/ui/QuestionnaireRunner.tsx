import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuestionnairesStore } from "../state/questionnairesContext";
import type { OptionValue, Questionnaire } from "../core/types";
import { scoreQuestionnaire, type ScoreOutcome } from "../core/scoring";
import { PssPatientDetails, type PssPatient } from "./PssPatientDetails";
import { SOURCE_PATIENT_FIELDS } from "../questionnaires/patientFields";
import { SOURCE_FOLLOWUP_FIELDS } from "../questionnaires/remainingSourceFields";
import { SourcePatientDetails } from "./SourcePatientDetails";
import { NeckScale } from "./NeckScale";

const FULL_TITLES: Record<string, string> = {
  AOS: "Ankle Osteoarthritis Scale",
  BFS: "Bristol Foot Score",
  DHI: "Duruoz Hand Index",
  CPGS: "Chronic Pain Grade Scale (CPGS) Questionnaire",
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
  "Bournemouth Neck": "Bournemouth Neck Questionnaire",
};

function getDisplayTitle(id: string, fallback: string): string {
  const fullTitle = Object.hasOwn(FULL_TITLES, id) ? FULL_TITLES[id] : undefined;
  if (!fullTitle) return fallback;
  return fullTitle.includes(id) ? fullTitle : `${id}: ${fullTitle}`;
}

export function QuestionnaireRunner() {
  const { all, selectedId } = useQuestionnairesStore();
  const entry = useMemo(() => all.find((x) => x.q.id === selectedId), [all, selectedId]);
  const q = entry?.q;

  if (!q) return <div style={{ marginTop: 12 }}>اختر استبيانًا</div>;
  return <QuestionnaireForm key={q.id} q={q} />;
}

function QuestionnaireForm({ q }: { q: Questionnaire }) {
  const [answers, setAnswers] = useState<Record<string, OptionValue>>({});
  const [showResult, setShowResult] = useState(false);
  const [sourcePatient, setSourcePatient] = useState<Record<string, string>>({});
  const [patient, setPatient] = useState<PssPatient>({
    name: "", birthDate: "", gender: "", phone: "", dominantHand: "", shoulderProblem: "", affectedShoulder: "",
  });
  const isPss = q.id === "PSS";
  const isIHOT = q.id === "iHOT-12" || q.id === "iHOT-33";
  const isNeck = ["Bournemouth Neck", "CPGS"].includes(q.id);
  const sourcePatientFields = Object.hasOwn(SOURCE_PATIENT_FIELDS, q.id) ? SOURCE_PATIENT_FIELDS[q.id] : [];
  const followUp = Object.hasOwn(SOURCE_FOLLOWUP_FIELDS, q.id) ? SOURCE_FOLLOWUP_FIELDS[q.id] : undefined;
  const followUpFields = (followUp?.fields ?? []).filter((field) => !field.when || sourcePatient[field.when.field] === field.when.value);
  const requiredPatientFields = [...sourcePatientFields, ...followUpFields].filter((field) => field.required !== false);
  const skipShoulder = isPss && patient.shoulderProblem === "لا";

  const score = useMemo(
    () => scoreQuestionnaire(q, answers),
    [answers, q],
  );

  function setAnswer(qid: string, value: OptionValue) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function setPatientField(field: keyof PssPatient, value: string) {
    setPatient((prev) => ({ ...prev, [field]: value,
      ...(field === "shoulderProblem" && value === "لا" ? { affectedShoulder: "" } : {}),
    }));
    setShowResult(false);
    if (field === "shoulderProblem" && value === "لا") setAnswers({});
  }

  const questions = q.items.filter((item) => item.type === "question");
  const workStatus = q.id === "iHOT-33" ? questions.find((item) =>
    item.options.some((option) => option.value === "K" || option.value === "L")) : undefined;
  const skipWork = workStatus && ["K", "L"].includes(String(answers[workStatus.id]));
  const workIds = new Set(workStatus
    ? questions.filter((item) => item.id !== workStatus.id).slice(22, 26).map((item) => item.id) : []);
  const hiddenIds = new Set(skipWork ? workIds : []);
  if (q.id === "MHQ") {
    for (const index of [32, 37]) {
      if (answers[questions[index]?.id] === 5) {
        questions.slice(index + 1, index + 5).forEach((item) => hiddenIds.add(item.id));
      }
    }
  }
  const skipWalking = q.id === "Edinburgh" && questions[0]?.options.some((option) =>
    option.label_ar.trim() === "لا" && answers[questions[0].id] === option.value);
  if (skipWalking) questions.slice(1).forEach((item) => hiddenIds.add(item.id));
  const visibleQuestions = questions.filter((item) => !hiddenIds.has(item.id));
  const progressQuestions = visibleQuestions.filter((item) => item.id !== workStatus?.id);
  // Function activities are the PSS questions with the X / 0–3 response scale.
  const functionIds = new Set(isPss ? questions.filter((item) => (
    item.options.some((option) => option.value === "X") &&
    item.options.some((option) => option.value === 3) &&
    item.options.every((option) => option.value === "X" || (
      typeof option.value === "number" && option.value >= 0 && option.value <= 3
    ))
  )).map((item) => item.id) : []);
  const functionNumbers = new Map([...functionIds].map((id, index) => [id, index + 1]));
  const totalQuestions = (skipShoulder ? 0 : progressQuestions.length)
    + (isPss ? (patient.shoulderProblem === "نعم" ? 7 : 6) : requiredPatientFields.length);
  const answered = progressQuestions.filter((item) => Object.hasOwn(answers, item.id)).length + (isPss
    ? Object.values(patient).filter((value) => value.trim()).length
    : requiredPatientFields.filter((field) => sourcePatient[field.id]?.trim()).length);
  const title = getDisplayTitle(q.id, q.title_ar);

  return (
    <form className={isNeck ? "neck-form" : undefined} style={{ marginTop: 14 }} onSubmit={(event) => {
      event.preventDefault();
      setShowResult(true);
    }}>
      <h2 style={{ margin: "8px 0 4px", fontSize: isNeck ? 22 : 26, lineHeight: 1.35 }}>{title}</h2>
      <div style={{ opacity: 0.8, fontSize: 15, marginBottom: 10 }}>
        {answered} / {totalQuestions} تمّت الإجابة
      </div>

      {isPss ? <PssPatientDetails patient={patient} onChange={setPatientField} /> : null}
      {sourcePatientFields.length > 0 ? (
        <SourcePatientDetails
          questionnaireId={q.id} fields={sourcePatientFields} values={sourcePatient}
          onChange={(field, value) => {
            setSourcePatient((previous) => ({ ...previous, [field]: value }));
            setShowResult(false);
          }}
        />
      ) : null}

      {isNeck ? <p className="small neck-instructions">
        اختر إجابة واحدة من 0 إلى 10 لكل سؤال.
        {q.id === "CPGS" ? " عدد الأيام يُكتب كعدد صحيح." : ""}
      </p> : null}
      {skipShoulder ? (
        <p className="shoulder-skip-note" role="status">
          {showResult ? "تم إكمال المعلومات العامة. " : ""}
          تم تخطي أسئلة الكتف لأنك أجبت بأنه لا توجد مشكلة في الكتف. لا توجد درجة PSS لحسابها.
        </p>
      ) : <div style={{ display: "grid", gap: 10 }}>
        {q.items.map((item) => {
          if (item.type === "section") {
            return (
              <div key={item.id} style={{ marginTop: 12, fontWeight: 800, fontSize: 18, lineHeight: 1.5 }}>
                {item.title_ar}
              </div>
            );
          }

          const qi = item;
          if (hiddenIds.has(qi.id)) return null;
          const picked = answers[qi.id];
          const isFunction = functionIds.has(qi.id);

          return (
            <fieldset
              key={qi.id}
              className={`question-card${isFunction ? " pss-question" : ""}`}
            >
              <legend className="question-legend">
                {isFunction ? `(${functionNumbers.get(qi.id)}) ` : ""}{qi.text_ar}
                {isFunction ? <span className="required-mark" aria-hidden="true"> *</span> : null}
              </legend>

              {isFunction ? <p className="single-choice-hint">اختر إجابة واحدة فقط.</p> : null}
              {qi.id === workStatus?.id ? <p className="small">
                يتم تخطي أسئلة العمل الأربعة عند اختيار التقاعد أو عدم العمل لأسباب أخرى غير حالة الورك.
              </p> : null}

              {qi.input ? (
                <input
                  type="number" className="input patient-input" dir="ltr"
                  name={`${q.id}-${qi.id}`} aria-label={qi.text_ar}
                  min={qi.input.min} max={qi.input.max} step={qi.input.step} required
                  value={picked ?? ""}
                  onChange={(event) => {
                    const value = event.target.valueAsNumber;
                    setAnswers((previous) => {
                      const next = { ...previous };
                      if (Number.isFinite(value)) next[qi.id] = value;
                      else delete next[qi.id];
                      return next;
                    });
                  }}
                />
              ) : isNeck ? (
                <NeckScale
                  name={`${q.id}-${qi.id}`} options={qi.options} value={picked}
                  onChange={(value) => setAnswer(qi.id, value)}
                />
              ) : <div className={isFunction ? "pss-choices" : "options"}>
                {qi.options.map((opt, optionIndex) => (
                  <label
                    key={`${qi.id}:${optionIndex}:${String(opt.value)}`}
                    className={isFunction ? "pss-choice" : "option"}
                  >
                    <input
                      type="radio"
                      name={`${q.id}-${qi.id}`}
                      value={String(opt.value)}
                      checked={picked === opt.value}
                      onChange={() => setAnswer(qi.id, opt.value)}
                      required={isFunction || q.id === "CPGS" || q.id === "FAAM" || q.id === "MHQ" || q.id === "Edinburgh"
                        || (isIHOT && qi.id !== workStatus?.id) || (q.id === "HOOS" && qi.id === questions[0]?.id)}
                    />
                    <span>
                      {isFunction ? <><bdi className="pss-option-value" dir="ltr">{opt.value}</bdi> ({opt.label_ar})</> : q.id === "CPGS" ? (
                        <><bdi dir="ltr">{opt.value}</bdi>{opt.label_ar !== String(opt.value) ? ` (${opt.label_ar})` : ""}</>
                      ) : isIHOT && typeof opt.value === "number" ? (
                        <><bdi dir="ltr">{opt.value}</bdi>{opt.label_ar !== String(opt.value) ? ` (${opt.label_ar})` : ""}</>
                      ) : q.id === "BFS" ? <><bdi dir="ltr">{opt.value}</bdi> — {opt.label_ar}</> : opt.label_ar}
                    </span>
                  </label>
                ))}
              </div>}
            </fieldset>
          );
        })}
      </div>}

      {followUp && followUpFields.length ? <SourcePatientDetails
        questionnaireId={`${q.id}-followup`} title={followUp.title_ar} introduction="" numbered={false}
        fields={followUpFields} values={sourcePatient}
        onChange={(field, value) => {
          setSourcePatient((previous) => ({ ...previous, [field]: value }));
          setShowResult(false);
        }}
      /> : null}

      <button
        type="submit"
        style={styles.finish}
      >
        {skipShoulder ? "إنهاء" : q.id === "CPGS" ? "إتمام الاستبيان" : "احسب النتيجة"}
      </button>

      {showResult && !skipShoulder ? (
        <ResultModal
          outcome={score}
          showScoringNote={["BFS", "FAAM", "iHOT-33", "MHQ", "Edinburgh"].includes(q.id)}
          onClose={() => {
            setShowResult(false);
          }}
        />
      ) : null}
    </form>
  );
}

function ResultModal({ outcome, onClose, showScoringNote = false }: { outcome: ScoreOutcome; onClose: () => void; showScoringNote?: boolean }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeButton.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      style={styles.modalOverlay}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        // The close button is the dialog's only interactive control.
        if (event.key === "Tab") { event.preventDefault(); closeButton.current?.focus(); }
      }}
    >
      <div style={styles.resultCard} onClick={(event) => event.stopPropagation()}>
        <div style={styles.resultHeader}>
          <div id="result-title" style={styles.resultTitle}>
            النتيجة
          </div>
          <button ref={closeButton} type="button" style={styles.closeButton} onClick={onClose}>
            إغلاق
          </button>
        </div>

        {outcome.status === "ready" ? (
          <>
            <div style={styles.direction}>{outcome.direction_ar}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {outcome.metrics.map((metric) => (
                <div key={metric.key} className="score-metric" style={styles.metricRow}>
                  <div style={styles.metricLabel}>{metric.label_ar}</div>
                  <div style={styles.metricValue}>{metric.display_ar}</div>
                </div>
              ))}
            </div>
            {showScoringNote && outcome.note_ar ? <p style={styles.note}>{outcome.note_ar}</p> : null}
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
