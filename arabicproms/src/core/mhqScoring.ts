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
  return ids.filter((id) => !(id in answers)).length;
}

function getNumericAnswer(answers: Record<string, OptionValue>, id: string): number | null {
  const value = answers[id];
  return typeof value === "number" ? value : null;
}

function sumNumeric(ids: string[], answers: Record<string, OptionValue>): number {
  return ids.reduce((sum, id) => sum + (getNumericAnswer(answers, id) ?? 0), 0);
}

function reverseFivePoint(value: number): number {
  return 6 - value;
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

  let painIds = [...painRightIds, ...painLeftIds];
  let painDenominator = 50;
  if (rightPainNever && leftPainNever) {
    painIds = [painRightIds[0], painLeftIds[0]];
    painDenominator = 5;
  } else if (rightPainNever) {
    painIds = painLeftIds;
    painDenominator = 20;
  } else if (leftPainNever) {
    painIds = painRightIds;
    painDenominator = 20;
  }
  const subscore3Raw = sumNumeric(painIds, answers);
  const subscore3 = scoreFromRaw(subscore3Raw, painDenominator);

  const appearancePositiveIds = new Set([appearanceIds[0], appearanceIds[4]]);
  const subscore4Raw = appearanceIds.reduce((sum, id) => {
    const value = getNumericAnswer(answers, id) ?? 0;
    return sum + (appearancePositiveIds.has(id) ? reverseFivePoint(value) : value);
  }, 0);
  const subscore4 = scoreFromRaw(subscore4Raw, 35);

  const subscore5Raw = satisfactionIds.reduce((sum, id) => {
    const value = getNumericAnswer(answers, id) ?? 0;
    return sum + reverseFivePoint(value);
  }, 0);
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
    direction_ar: "Subscore 1 الأقل أفضل. Subscores 2 و4 و5 الأعلى أفضل. Subscore 3 للألم: الأقل يعني ألمًا أقل وحالة أفضل.",
    note_ar:
      "تم احتساب MHQ من ملف scoring المرفق: Subscore = ((raw score - 5) / range) × 100. قاعدة الألم تستخدم /50 عادة، /20 إذا كانت إجابة never ليد واحدة، و/5 إذا كانت إجابة never لليدين.",
  };
}
