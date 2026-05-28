import type { OptionValue, Questionnaire, QuestionItem, Option } from "./types";
import { scoreMHQ } from "./mhqScoring";
import { scoreFromRegistry } from "../scoring";

export type ScoreMetric = {
  key: string;
  label_ar: string;
  value: number;
  display_ar: string;
};

export type ScoreOutcome =
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
    }
  | {
      status: "unsupported";
      note_ar: string;
    };

const KOOS_JR_LOOKUP: Record<number, number> = {
  0: 100,
  1: 91.975,
  2: 84.6,
  3: 79.914,
  4: 76.332,
  5: 73.342,
  6: 70.704,
  7: 68.284,
  8: 65.994,
  9: 63.776,
  10: 61.583,
  11: 59.381,
  12: 57.14,
  13: 54.84,
  14: 52.465,
  15: 50.012,
  16: 47.487,
  17: 44.905,
  18: 42.281,
  19: 39.625,
  20: 36.931,
  21: 34.174,
  22: 31.307,
  23: 28.251,
  24: 24.875,
  25: 20.941,
  26: 15.939,
  27: 8.291,
  28: 0,
};

const HOOS_JR_LOOKUP: Record<number, number> = {
  0: 100,
  1: 92.34,
  2: 85.257,
  3: 80.55,
  4: 76.776,
  5: 73.472,
  6: 70.426,
  7: 67.516,
  8: 64.664,
  9: 61.815,
  10: 58.93,
  11: 55.985,
  12: 52.965,
  13: 49.858,
  14: 46.652,
  15: 43.335,
  16: 39.902,
  17: 36.363,
  18: 32.735,
  19: 29.009,
  20: 25.103,
  21: 20.805,
  22: 15.633,
  23: 8.104,
  24: 0,
};

const UNSUPPORTED_NOTES: Record<string, string> = {
};

function getQuestions(q: Questionnaire): QuestionItem[] {
  return q.items.filter((item): item is QuestionItem => item.type === "question");
}

function getNumericOptionValues(question: QuestionItem): number[] {
  return question.options
    .map((option) => option.value)
    .filter((value): value is number => typeof value === "number");
}

function getSelectedOption(
  question: QuestionItem,
  answers: Record<string, OptionValue>,
): Option | null {
  const picked = answers[question.id];
  return question.options.find((option) => option.value === picked) ?? null;
}

function getMissingCount(ids: string[], answers: Record<string, OptionValue>): number {
  return ids.filter((id) => !(id in answers)).length;
}

function getNumericAnswer(answers: Record<string, OptionValue>, id: string): number | null {
  const value = answers[id];
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value);
  }
  return null;
}

function getAnsweredValue(answers: Record<string, OptionValue>, id: string): OptionValue | undefined {
  return answers[id];
}

function sumNumeric(ids: string[], answers: Record<string, OptionValue>): number {
  return ids.reduce((sum, id) => sum + (getNumericAnswer(answers, id) ?? 0), 0);
}

function mapYesPartlyNo(question: QuestionItem, answers: Record<string, OptionValue>): number | null {
  const label = getSelectedOption(question, answers)?.label_ar.trim() ?? "";
  if (label === "نعم") return 2;
  if (label === "جزئيًا") return 1;
  if (label === "لا") return 0;
  return null;
}

function mapDescendingScale(question: QuestionItem, answers: Record<string, OptionValue>): number | null {
  const picked = answers[question.id];
  const selectedIndex = question.options.findIndex((option) => option.value === picked);
  if (selectedIndex === -1) return null;
  return question.options.length - 1 - selectedIndex;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatRaw(value: number, max: number): string {
  return `${value} / ${max}`;
}

function buildIncomplete(missingCount: number): ScoreOutcome {
  return {
    status: "incomplete",
    missingCount,
    note_ar: `أكمل ${missingCount} سؤال/أسئلة مطلوبة لحساب النتيجة.`,
  };
}

function scoreFAAM(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 28);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const adlIds = questionIds.slice(0, 21);
  const sportsIds = questionIds.slice(21, 28);

  const scoreGroup = (ids: string[]) => {
    const numericValues = ids
      .map((id) => getAnsweredValue(answers, id))
      .filter((value): value is number => typeof value === "number");
    const denominator = numericValues.length * 4;
    return denominator > 0
      ? (numericValues.reduce((sum, value) => sum + value, 0) / denominator) * 100
      : 0;
  };

  const adlScore = scoreGroup(adlIds);
  const sportsScore = scoreGroup(sportsIds);

  const metrics: ScoreMetric[] = [
    {
      key: "adl_score",
      label_ar: "FAAM ADL",
      value: adlScore,
      display_ar: formatPercent(adlScore),
    },
    {
      key: "sports_score",
      label_ar: "FAAM Sports",
      value: sportsScore,
      display_ar: formatPercent(sportsScore),
    },
  ];

  return {
    status: "ready",
    metrics,
    direction_ar: "الدرجة الأعلى تعني وظيفة أفضل للقدم/الكاحل.",
    note_ar: "يتم استبعاد إجابات N/A من المجموع ومن المقام، وتُعرض درجتا FAAM ADL وFAAM Sports بشكل منفصل.",
  };
}

function scoreAOS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 18);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const painIds = questionIds.slice(0, 9);
  const functionIds = questionIds.slice(9, 18);

  const painRawScore = sumNumeric(painIds, answers);
  const functionRawScore = sumNumeric(functionIds, answers);
  const totalRawScore = painRawScore + functionRawScore;

  const painScore = (painRawScore / 90) * 100;
  const functionScore = (functionRawScore / 90) * 100;
  const totalScore = (totalRawScore / 180) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "pain_subscore",
        label_ar: "درجة الألم",
        value: painScore,
        display_ar: formatPercent(painScore),
      },
      {
        key: "function_subscore",
        label_ar: "درجة الوظيفة",
        value: functionScore,
        display_ar: formatPercent(functionScore),
      },
      {
        key: "total_score",
        label_ar: "الدرجة الكلية",
        value: totalScore,
        display_ar: formatPercent(totalScore),
      },
    ],
    direction_ar: "الدرجة الأعلى أفضل.",
    note_ar:
      "درجة الألم = مجموع أول 9 أسئلة / 90 × 100. درجة الوظيفة = مجموع آخر 9 أسئلة / 90 × 100. الدرجة الكلية = مجموع كل 18 سؤالًا / 180 × 100.",
  };
}

function scoreBFS(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const scoredQuestions = questions.slice(1);
  const requiredIds = scoredQuestions.map((question) => question.id);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  let raw = 0;
  let minPossible = 0;
  let maxPossible = 0;
  let notApplicableCount = 0;

  scoredQuestions.forEach((question, index) => {
    const selectedValue = getNumericAnswer(answers, question.id);
    if (index < 4 && selectedValue === 9) {
      notApplicableCount++;
      return;
    }

    const values = getNumericOptionValues(question).filter((value) => !(index < 4 && value === 9));
    raw += selectedValue ?? 0;
    minPossible += Math.min(...values);
    maxPossible += Math.max(...values);
  });

  const percent =
    maxPossible > minPossible
      ? ((raw - minPossible) / (maxPossible - minPossible)) * 100
      : 0;

  return {
    status: "ready",
    metrics: [
      {
        key: "total_score",
        label_ar: "الدرجة الكلية",
        value: percent,
        display_ar: formatPercent(percent),
      },
      {
        key: "raw_score",
        label_ar: "المجموع الخام",
        value: raw,
        display_ar: formatRaw(raw, maxPossible),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      notApplicableCount > 0
        ? `السؤال الأول التمهيدي مستبعد من الحساب. في أول 4 أسئلة، تُحسب الإجابات الرقمية العادية وتُستبعد إجابات 9 لأنها تعني "لا ينطبق" وليست درجة شدة. تم استبعاد ${notApplicableCount} إجابة.`
        : "السؤال الأول التمهيدي مستبعد من الحساب. في أول 4 أسئلة، تُحسب الإجابات الرقمية العادية فقط، أما 9 فهي رمز \"لا ينطبق\" ولا تُضاف للدرجة. درجة BFS = (المجموع الخام - 15) / 58 × 100.",
  };
}

function scoreDHI(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 18);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);

  return {
    status: "ready",
    metrics: [
      {
        key: "total_score",
        label_ar: "الدرجة الكلية",
        value: raw,
        display_ar: formatRaw(raw, 90),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "درجة DHI = مجموع درجات الأسئلة الـ18. كل سؤال من 0 إلى 5، لذلك النطاق الكلي 0 إلى 90. الدرجة الأقل تعني وظيفة يد أفضل.",
  };
}

function scorePSS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 24);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const painIds = questionIds.slice(0, 3);
  const satisfactionId = questionIds[3];
  const functionIds = questionIds.slice(4, 24);

  const painScore = painIds.reduce((sum, id) => {
    const answer = getAnsweredValue(answers, id);
    if (answer === "X") return sum;
    const value = getNumericAnswer(answers, id);
    return value === null ? sum : sum + (10 - value);
  }, 0);
  const satisfaction = getNumericAnswer(answers, satisfactionId) ?? 0;

  const functionRaw = sumNumeric(functionIds, answers);
  const xCount = functionIds.reduce(
    (count, id) => count + (getAnsweredValue(answers, id) === "X" ? 1 : 0),
    0,
  );
  const adjustedFunctionMax = 60 - xCount * 3;
  const functionScore =
    adjustedFunctionMax > 0 ? (functionRaw / adjustedFunctionMax) * 60 : 0;

  const totalScore = painScore + satisfaction + functionScore;

  return {
    status: "ready",
    metrics: [
      {
        key: "pain_score",
        label_ar: "درجة الألم",
        value: painScore,
        display_ar: formatRaw(painScore, 30),
      },
      {
        key: "satisfaction_score",
        label_ar: "درجة الرضا",
        value: satisfaction,
        display_ar: formatRaw(satisfaction, 10),
      },
      {
        key: "function_score",
        label_ar: "درجة الوظيفة",
        value: functionScore,
        display_ar: formatRaw(Number(functionScore.toFixed(1)), 60),
      },
      {
        key: "total_score",
        label_ar: "الدرجة الكلية",
        value: totalScore,
        display_ar: formatRaw(Number(totalScore.toFixed(1)), 100),
      },
    ],
    direction_ar: "الدرجة الكلية الأعلى أفضل.",
    note_ar:
      "درجة الألم = مجموع (10 - الرقم المختار) لأسئلة الألم الثلاثة، وخيار لا ينطبق في النشاط العادي أو الشاق يساوي 0. درجة الرضا = الرقم المختار /10. درجة الوظيفة = a ÷ (60 - 3×عدد X) × 60. الدرجة الكلية = الألم + الرضا + الوظيفة.",
  };
}

function scoreHOOS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const scoredIds = questionIds.length > 40 ? questionIds.slice(1, 41) : questionIds.slice(0, 40);
  const requiredIds = scoredIds;
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const groups = [
    {
      key: "symptoms",
      label_ar: "الأعراض",
      ids: scoredIds.slice(0, 5),
      denominator: 20,
    },
    {
      key: "pain",
      label_ar: "الألم",
      ids: scoredIds.slice(5, 15),
      denominator: 40,
    },
    {
      key: "adl_function",
      label_ar: "الوظيفة في الحياة اليومية",
      ids: scoredIds.slice(15, 32),
      denominator: 68,
    },
    {
      key: "sport_recreation",
      label_ar: "الوظائف الرياضية والترفيهية",
      ids: scoredIds.slice(32, 36),
      denominator: 16,
    },
    {
      key: "quality_of_life",
      label_ar: "جودة الحياة",
      ids: scoredIds.slice(36, 40),
      denominator: 16,
    },
  ] as const;

  const metrics: ScoreMetric[] = groups.map((group) => {
    const raw = sumNumeric(group.ids, answers);
    const percent = (raw / group.denominator) * 100;
    return {
      key: group.key,
      label_ar: group.label_ar,
      value: percent,
      display_ar: formatPercent(percent),
    };
  });
  const summaryScore =
    metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
  metrics.push({
    key: "summary_score",
    label_ar: "متوسط HOOS الكلي",
    value: summaryScore,
    display_ar: formatPercent(summaryScore),
  });

  return {
    status: "ready",
    metrics,
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "سؤال الورك المصاب يمين/يسار غير داخل الحساب. كل مقياس فرعي = مجموع إجابات القسم / مقام القسم × 100. متوسط HOOS الكلي = (الأعراض + الألم + الوظيفة اليومية + الرياضة/الترفيه + جودة الحياة) ÷ 5.",
  };
}

function scoreHOOS12(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 12);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const groups = [
    {
      key: "pain",
      label_ar: "الألم",
      ids: questionIds.slice(0, 4),
      denominator: 16,
    },
    {
      key: "adl_function",
      label_ar: "الوظيفة في الحياة اليومية",
      ids: questionIds.slice(4, 8),
      denominator: 16,
    },
    {
      key: "quality_of_life",
      label_ar: "جودة الحياة",
      ids: questionIds.slice(8, 12),
      denominator: 16,
    },
  ] as const;

  const metrics: ScoreMetric[] = groups.map((group) => {
    const raw = sumNumeric(group.ids, answers);
    const percent = (raw / group.denominator) * 100;
    return {
      key: group.key,
      label_ar: group.label_ar,
      value: percent,
      display_ar: formatPercent(percent),
    };
  });
  const summaryScore =
    metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
  metrics.push({
    key: "summary_score",
    label_ar: "الدرجة الملخصة الكلية",
    value: summaryScore,
    display_ar: formatPercent(summaryScore),
  });

  return {
    status: "ready",
    metrics,
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "كل مقياس فرعي في HOOS-12 = مجموع 4 إجابات / 16 × 100. الدرجة الملخصة = (درجة الألم + درجة الوظيفة اليومية + درجة جودة الحياة) ÷ 3.",
  };
}

function scoreKOOS12(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 12);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const groups = [
    {
      key: "pain",
      label_ar: "الألم",
      ids: questionIds.slice(0, 4),
      denominator: 16,
    },
    {
      key: "function",
      label_ar: "الوظيفة اليومية",
      ids: questionIds.slice(4, 8),
      denominator: 16,
    },
    {
      key: "quality_of_life",
      label_ar: "جودة الحياة",
      ids: questionIds.slice(8, 12),
      denominator: 16,
    },
  ] as const;

  const metrics: ScoreMetric[] = groups.map((group) => {
    const raw = sumNumeric(group.ids, answers);
    const percent = (raw / group.denominator) * 100;
    return {
      key: group.key,
      label_ar: group.label_ar,
      value: percent,
      display_ar: formatPercent(percent),
    };
  });

  const totalRaw = sumNumeric(requiredIds, answers);
  const total = (totalRaw / 48) * 100;
  metrics.push({
    key: "total",
    label_ar: "الدرجة الكلية",
    value: total,
    display_ar: formatPercent(total),
  });

  return {
    status: "ready",
    metrics,
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل KOOS-12 من ورقة Score calculation المحلية: كل مقياس فرعي = (مجموع الإجابات / 16) × 100، والدرجة الكلية = (مجموع الإجابات / 48) × 100.",
  };
}

function scoreFAOS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 41);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const groups = [
    {
      key: "symptoms",
      label_ar: "الأعراض",
      ids: questionIds.slice(0, 7),
      denominator: 28,
    },
    {
      key: "pain",
      label_ar: "الألم",
      ids: questionIds.slice(7, 16),
      denominator: 36,
    },
    {
      key: "adl_function",
      label_ar: "الوظيفة في الحياة اليومية",
      ids: questionIds.slice(16, 32),
      denominator: 64,
    },
    {
      key: "sports_function",
      label_ar: "الوظيفة الرياضية والترفيهية",
      ids: questionIds.slice(32, 37),
      denominator: 20,
    },
    {
      key: "quality_of_life",
      label_ar: "جودة الحياة",
      ids: questionIds.slice(37, 41),
      denominator: 16,
    },
  ] as const;

  const metrics: ScoreMetric[] = groups.map((group) => {
    const raw = sumNumeric(group.ids, answers);
    const percent = (raw / group.denominator) * 100;
    return {
      key: group.key,
      label_ar: group.label_ar,
      value: percent,
      display_ar: formatPercent(percent),
    };
  });

  return {
    status: "ready",
    metrics,
    direction_ar: "الدرجة الأقل أفضل وفق ترميز النقاط الظاهر في ورقة Score Calculation.",
    note_ar:
      "تم تفعيل FAOS من ورقة Score Calculation المحلية. يوجد تناقض داخل الملف بين ملاحظة الاتجاه النهائي وبين ترميز النقاط، كما أن كتلة ADL تحتوي 16 سؤالًا ظاهرًا في الملف الحالي ولذلك استُخدم مقام 64.",
  };
}

function scoreJR(
  requiredIds: string[],
  answers: Record<string, OptionValue>,
  lookup: Record<number, number>,
  rawMax: number,
): ScoreOutcome {
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);
  const converted = lookup[raw];
  if (converted === undefined) {
    return {
      status: "unsupported",
      note_ar: "تعذر مطابقة المجموع الخام مع جدول التحويل المحلي.",
    };
  }

  return {
    status: "ready",
    metrics: [
      {
        key: "raw_score",
        label_ar: "المجموع الخام",
        value: raw,
        display_ar: formatRaw(raw, rawMax),
      },
      {
        key: "converted_score",
        label_ar: "الدرجة المحولة",
        value: converted,
        display_ar: `${converted} / 100`,
      },
    ],
    direction_ar: "الدرجة المحولة الأعلى أفضل.",
    note_ar:
      `تُجمع درجات الأسئلة الخام أولًا من 0 إلى ${rawMax}، ثم تُحوّل باستخدام جدول التحويل الخاص بالاستبيان. المجموع الخام الأقل أفضل، أما الدرجة المحولة الأعلى فهي أفضل.`,
  };
}

function scoreHOOSPS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 5);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);
  const percent = (raw / 20) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "physical_function_shortform",
        label_ar: "الوظيفة الجسدية المختصرة",
        value: percent,
        display_ar: formatPercent(percent),
      },
      {
        key: "raw_score",
        label_ar: "المجموع الخام",
        value: raw,
        display_ar: formatRaw(raw, 20),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "درجة HOOS-PS = مجموع درجات الأسئلة الخمسة / 20 × 100. الدرجة الأقل تعني حالة صحية أفضل.",
  };
}

function scoreLLTQ(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const abilityQuestions = questions.filter((question) => question.text_ar.includes("القدرة"));
  if (abilityQuestions.length < 20) {
    return {
      status: "unsupported",
      note_ar: "تعذر احتساب LLTQ لأن عدد أسئلة القدرة أقل من 20.",
    };
  }
  const adlAbilityIds = abilityQuestions.slice(0, 10).map((question) => question.id);
  const sportAbilityIds = abilityQuestions.slice(10, 20).map((question) => question.id);
  const requiredIds = [...adlAbilityIds, ...sportAbilityIds];
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const adlRaw = sumNumeric(adlAbilityIds, answers);
  const sportRaw = sumNumeric(sportAbilityIds, answers);
  const adlPercent = (adlRaw / 40) * 100;
  const sportPercent = (sportRaw / 40) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "adl_subscore",
        label_ar: "LLTQ ADL",
        value: adlPercent,
        display_ar: `${adlPercent.toFixed(1)} / 100`,
      },
      {
        key: "sport_subscore",
        label_ar: "LLTQ Sports",
        value: sportPercent,
        display_ar: `${sportPercent.toFixed(1)} / 100`,
      },
    ],
    direction_ar: "الدرجة الأعلى تعني وظيفة أفضل للطرف السفلي.",
    note_ar: "يتم احتساب LLTQ من أسئلة القدرة فقط: 10 أسئلة ADL / 40 و10 أسئلة Sports / 40. أسئلة الأهمية لا تدخل في النتيجة.",
  };
}

function scoreIHOT12(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(-12);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);
  const percent = (raw / 120) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "total_score",
        label_ar: "الدرجة الكلية",
        value: percent,
        display_ar: `${percent.toFixed(1)} / 100`,
      },
      {
        key: "raw_score",
        label_ar: "المجموع الخام",
        value: raw,
        display_ar: formatRaw(raw, 120),
      },
    ],
    direction_ar: "الدرجة الأعلى أفضل.",
    note_ar:
      "سؤال الجانب يمين/يسار غير داخل الحساب. درجة iHOT-12 = مجموع إجابات الأسئلة الـ12 / 120 × 100. الدرجة الأعلى تعني حالة أفضل.",
  };
}

function scoreIHOT33(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const workStatusQuestion = questions.find((question) =>
    question.options.some((option) => option.value === "K" || option.value === "L"),
  );
  const workStatusId = workStatusQuestion?.id;
  const skipWorkSection =
    workStatusId !== undefined && (answers[workStatusId] === "K" || answers[workStatusId] === "L");
  const scoredQuestions = workStatusQuestion
    ? questions.filter((question) => question.id !== workStatusQuestion.id)
    : questions;
  const workQuestions = scoredQuestions.slice(22, 26);
  const nonWorkQuestions = [...scoredQuestions.slice(0, 22), ...scoredQuestions.slice(26)];

  const requiredQuestions = skipWorkSection ? nonWorkQuestions : scoredQuestions;
  const requiredIds = requiredQuestions.map((question) => question.id);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = requiredQuestions.reduce((sum, question) => {
    const answer = answers[question.id];
    return typeof answer === "number" ? sum + answer : sum;
  }, 0);

  const columnACount = requiredQuestions.reduce((count, question) => {
    const answer = answers[question.id];
    return count + (typeof answer === "string" ? 1 : 0);
  }, 0);
  const baseDenominator = skipWorkSection ? 80 : 120;
  const denominator = baseDenominator - columnACount;
  const percent = denominator > 0 ? (raw / denominator) * 100 : 0;

  return {
    status: "ready",
    metrics: [
      {
        key: "total_score",
        label_ar: "الدرجة الكلية",
        value: percent,
        display_ar: `${percent.toFixed(1)} / 100`,
      },
      {
        key: "raw_score",
        label_ar: "المجموع الخام",
        value: raw,
        display_ar: formatRaw(raw, denominator),
      },
      {
        key: "adjusted_denominator",
        label_ar: "المقام المعدّل",
        value: denominator,
        display_ar: `${denominator}`,
      },
    ],
    direction_ar: "الدرجة الأعلى أفضل.",
    note_ar: skipWorkSection
      ? `تم تخطي قسم العمل لأن خيار K أو L مُحدد. درجة iHOT-33 = المجموع الخام / (80 - عدد إجابات العمود A خارج قسم العمل) × 100. تم استبعاد ${columnACount} إجابة/إجابات من العمود A من المقام.`
      : `درجة iHOT-33 = المجموع الخام / (120 - عدد إجابات العمود A) × 100. تم استبعاد ${columnACount} إجابة/إجابات من العمود A من المقام.`,
  };
}

function scoreSFI10(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const part1Questions = questions.slice(0, 10);
  const nrsQuestion = questions[10];
  const requiredIds = [...part1Questions.map((question) => question.id), nrsQuestion?.id].filter(
    (id): id is string => Boolean(id),
  );
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);
  if (!nrsQuestion) {
    return {
      status: "unsupported",
      note_ar: "تعذر العثور على سؤال NRS في ملف SFI-10 الحالي.",
    };
  }

  let raw = 0;
  for (const question of part1Questions) {
    const value = mapYesPartlyNo(question, answers);
    if (value === null) {
      return {
        status: "unsupported",
        note_ar: "تعذر مطابقة إحدى إجابات نعم/جزئيًا/لا مع ورقة الاحتساب المحلية.",
      };
    }
    raw += value;
  }

  const percent = (raw / 20) * 100;
  const nrs = mapDescendingScale(nrsQuestion, answers);
  if (nrs === null) {
    return {
      status: "unsupported",
      note_ar: "تعذر مطابقة قيمة NRS مع ترتيب الخيارات الحالي في SFI-10.",
    };
  }

  return {
    status: "ready",
    metrics: [
      {
        key: "sfi_part_1_percent",
        label_ar: "درجة SFI الجزء الأول",
        value: percent,
        display_ar: formatPercent(percent),
      },
      {
        key: "raw_score",
        label_ar: "المجموع الخام للجزء الأول",
        value: raw,
        display_ar: formatRaw(raw, 20),
      },
      {
        key: "nrs_part_2",
        label_ar: "درجة NRS الجزء الثاني",
        value: nrs,
        display_ar: formatRaw(nrs, 10),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل SFI-10 من ورقة Score Calculation المحلية: الجزء الأول يحسب من 10 أسئلة فقط بنقاط نعم = 2، جزئيًا = 1، لا = 0، ثم (المجموع الخام / 20) × 100. أما الجزء الثاني فهو سؤال NRS مستقل من 0 إلى 10.",
  };
}

export function scoreQuestionnaire(
  q: Questionnaire,
  answers: Record<string, OptionValue>,
): ScoreOutcome {
  const questions = getQuestions(q);
  const questionIds = questions.map((question) => question.id);
  const registryScore = scoreFromRegistry(q, answers);
  if (registryScore) return registryScore;

  switch (q.id) {
    case "AOS":
      return scoreAOS(questionIds, answers);
    case "BFS":
      return scoreBFS(questions, answers);
    case "DHI":
      return scoreDHI(questionIds, answers);
    case "FAAM":
      return scoreFAAM(questionIds, answers);
    case "FAOS":
      return scoreFAOS(questionIds, answers);
    case "HOOS":
      return scoreHOOS(questionIds, answers);
    case "HOOS-12":
      return scoreHOOS12(questionIds, answers);
    case "KOOS-12":
      return scoreKOOS12(questionIds, answers);
    case "MHQ":
      return scoreMHQ(questionIds, answers);
    case "PSS":
      return scorePSS(questionIds, answers);
    case "SFI-10":
      return scoreSFI10(questions, answers);
    case "HOOS-JR":
      return scoreJR(questionIds.slice(0, 6), answers, HOOS_JR_LOOKUP, 24);
    case "HOOS-PS":
      return scoreHOOSPS(questionIds, answers);
    case "KOOS-JR":
      return scoreJR(questionIds.slice(0, 7), answers, KOOS_JR_LOOKUP, 28);
    case "LLTQ":
      return scoreLLTQ(questions, answers);
    case "iHOT-12":
      return scoreIHOT12(questionIds, answers);
    case "iHOT-33":
      return scoreIHOT33(questions, answers);
    default:
      return {
        status: "unsupported",
        note_ar:
          UNSUPPORTED_NOTES[q.id] ??
          "لا توجد نتيجة مفعلة لهذا الاستبيان بعد لأن قواعد الاحتساب المحلية لم تُحسم بعد.",
      };
  }
}
