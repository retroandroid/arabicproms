import type { OptionValue } from "./types";

type ScoreMetric = {
  key: string;
  label_ar: string;
  value: number;
  display_ar: string;
};

type ScoreOutcome =
  | {
      status: "ready";
      metrics: ScoreMetric[];
      direction_ar: string;
      note_ar?: string;
    }
  | {
      status: "incomplete";
      missingCount: number;
      note_ar: string;
    };

function getMissingCount(ids: string[], answers: Record<string, OptionValue>): number {
  return ids.filter((id) => !Object.hasOwn(answers, id)).length;
}

function getNumericAnswer(answers: Record<string, OptionValue>, id: string): number | null {
  const value = answers[id];
  return typeof value === "number" ? value : null;
}

function sumNumeric(ids: string[], answers: Record<string, OptionValue>): number {
  return ids.reduce((sum, id) => sum + (getNumericAnswer(answers, id) ?? 0), 0);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function buildIncomplete(missingCount: number): ScoreOutcome {
  return {
    status: "incomplete",
    missingCount,
    note_ar: `أكمل ${missingCount} سؤال/أسئلة مطلوبة لحساب النتيجة.`,
  };
}

function scoreFromRaw(raw: number, denominator: number): number {
  return ((raw - 5) / denominator) * 100;
}

export function scoreMHQ(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const scoredIds = questionIds.slice(0, 62);
  const generalFunctionIds = scoredIds.slice(0, 10);
  const activityIds = scoredIds.slice(10, 27);
  const workIds = scoredIds.slice(27, 32);
  const painRightIds = scoredIds.slice(32, 37);
  const painLeftIds = scoredIds.slice(37, 42);
  const appearanceIds = scoredIds.slice(42, 50);
  const satisfactionIds = scoredIds.slice(50, 62);

  const rightPainNever = getNumericAnswer(answers, painRightIds[0]) === 5;
  const leftPainNever = getNumericAnswer(answers, painLeftIds[0]) === 5;

  const requiredIds = [
    ...generalFunctionIds,
    ...activityIds,
    ...workIds,
    painRightIds[0],
    painLeftIds[0],
    ...(rightPainNever ? [] : painRightIds.slice(1)),
    ...(leftPainNever ? [] : painLeftIds.slice(1)),
    ...appearanceIds,
    ...satisfactionIds,
  ];
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const subscore1Raw = sumNumeric([...generalFunctionIds, ...activityIds], answers);
  const subscore1 = scoreFromRaw(subscore1Raw, 130);

  const subscore2Raw = sumNumeric(workIds, answers);
  const subscore2 = scoreFromRaw(subscore2Raw, 20);

  // The reference skips follow-ups, not the answered pain-frequency item.
  const painIds = [
    painRightIds[0], ...(rightPainNever ? [] : painRightIds.slice(1)),
    painLeftIds[0], ...(leftPainNever ? [] : painLeftIds.slice(1)),
  ];
  let painDenominator = 50;
  if (rightPainNever && leftPainNever) {
    painDenominator = 5;
  } else if (rightPainNever || leftPainNever) {
    painDenominator = 20;
  }
  const subscore3Raw = sumNumeric(painIds, answers);
  const subscore3 = scoreFromRaw(subscore3Raw, painDenominator);

  // The supplied Word formulas sum the workbook codes without item reversals.
  const subscore4Raw = sumNumeric(appearanceIds, answers);
  const subscore4 = scoreFromRaw(subscore4Raw, 35);

  const subscore5Raw = sumNumeric(satisfactionIds, answers);
  const subscore5 = scoreFromRaw(subscore5Raw, 55);

  return {
    status: "ready",
    metrics: [
      {
        key: "subscore_1_overall_hand_function",
        label_ar: "Subscore 1: وظيفة اليد العامة",
        value: subscore1,
        display_ar: formatPercent(subscore1),
      },
      {
        key: "subscore_2_work_performance",
        label_ar: "Subscore 2: الأداء في العمل",
        value: subscore2,
        display_ar: formatPercent(subscore2),
      },
      {
        key: "subscore_3_pain",
        label_ar: "Subscore 3: الألم",
        value: subscore3,
        display_ar: formatPercent(subscore3),
      },
      {
        key: "subscore_4_appearance",
        label_ar: "Subscore 4: المظهر",
        value: subscore4,
        display_ar: formatPercent(subscore4),
      },
      {
        key: "subscore_5_satisfaction",
        label_ar: "Subscore 5: الرضا",
        value: subscore5,
        display_ar: formatPercent(subscore5),
      },
    ],
    direction_ar: "المقياس 1 الأقل أفضل. المقاييس 2 و4 و5 الأعلى أفضل وفق المرجع المرفق. اتجاه تفسير مقياس الألم متعارض داخل المرجع.",
    note_ar:
      `وفق ملف الاحتساب المرفق: كل مقياس = (مجموع رموز الإجابات − 5) ÷ المقام × 100. المقامات هي 130 و20 و${painDenominator} و35 و55. تُستبعد متابعات الألم لليد التي أُجيب عنها «أبدًا»، وتبقى إجابة التكرار ضمن المجموع. قد تتجاوز معادلة الألم المرفقة 100؛ لا تُعدّل النتيجة أو يُعكس ترميز الإجابات.`,
  };
}
