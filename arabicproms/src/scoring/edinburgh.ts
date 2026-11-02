import type { OptionValue, Questionnaire } from "../core/types";
import type { ScoreMetric, ScoreOutcome } from "../core/scoring";
import { incomplete, missingCount, questionsOf, selectedLabel } from "./helpers";

function hasYes(label: string): boolean {
  return label === "نعم" || label.includes("نعم");
}

function hasNo(label: string): boolean {
  return label === "لا" || label.includes("لا");
}

export function scoreEdinburgh(q: Questionnaire, answers: Record<string, OptionValue>): ScoreOutcome {
  const questions = questionsOf(q).slice(0, 6);
  // The Word decision rule stops at Q1 = No; later responses are not required.
  if (hasNo(selectedLabel(questions[0], answers))) {
    return {
      status: "ready",
      metrics: [
        { key: "ecq_result", label_ar: "ECQ result", value: 0, display_ar: "Negative" },
        { key: "classification", label_ar: "Classification", value: 0, display_ar: "Negative ECQ" },
      ],
      direction_ar: "ECQ is a diagnostic checklist, not an added-point score.",
      note_ar: "تم إيقاف الاستبيان عند إجابة «لا» عن ألم المشي في السؤال الأول، وفق المرجع المرفق. النتيجة سلبية ولا تُحدّد درجة شدة من الأسئلة المتخطاة.",
    };
  }
  const requiredIds = questions.map((question) => question.id);
  const missing = missingCount(requiredIds, answers);
  if (missing) return incomplete(missing);

  const [q1, q2, q3, q4, q5, q6] = questions;
  const q1Label = selectedLabel(q1, answers);
  const q2Label = selectedLabel(q2, answers);
  const q3Label = selectedLabel(q3, answers);
  const q4Label = selectedLabel(q4, answers);
  const q5Label = selectedLabel(q5, answers);
  const q6Label = selectedLabel(q6, answers);

  const requiredAnswersMet =
    hasYes(q1Label) && hasNo(q2Label) && hasYes(q3Label) && q5Label.startsWith("يختفي");
  const calfPain = q6Label.includes("بطة") || q6Label.includes("ربلة") || q6Label.includes("calf");
  const thighOrButtockPain =
    q6Label.includes("الفخذ") || q6Label.includes("الأرداف") || q6Label.includes("buttock");

  let positive = false;
  let classification = "negative";
  let classificationAr = "Negative ECQ";

  if (requiredAnswersMet && calfPain) {
    positive = true;
    classification = "definite";
    classificationAr = "Definite claudication";
  } else if (requiredAnswersMet && thighOrButtockPain) {
    positive = true;
    classification = "atypical";
    classificationAr = "Atypical claudication";
  }

  const metrics: ScoreMetric[] = [
    {
      key: "ecq_result",
      label_ar: "ECQ result",
      value: positive ? 1 : 0,
      display_ar: positive ? "Positive" : "Negative",
    },
    {
      key: "classification",
      label_ar: "Classification",
      value: positive ? (classification === "definite" ? 2 : 1) : 0,
      display_ar: classificationAr,
    },
  ];

  if (positive) metrics.push({
    key: "severity",
    label_ar: "Severity from Q4",
    value: hasYes(q4Label) ? 2 : 1,
    display_ar: hasYes(q4Label)
      ? "Grade 2: Pain on normal level-ground walking"
      : "Grade 1: Pain only with uphill/hurrying",
  });

  return {
    status: "ready",
    metrics,
    direction_ar: "ECQ is a diagnostic checklist, not an added-point score.",
    note_ar:
      "Positive ECQ requires Q1 Yes, Q2 No, Q3 Yes, Q5 relief within 10 minutes or less, and calf/thigh/buttock pain. Calf pain = definite; thigh/buttock only = atypical; other locations = negative.",
  };
}
