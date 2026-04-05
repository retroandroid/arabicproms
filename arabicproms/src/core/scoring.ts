import type { OptionValue, Questionnaire, QuestionItem, Option } from "./types";

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

function reverseFivePoint(value: number): number {
  return 6 - value;
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

  const currentFunction = getNumericAnswer(answers, questionIds[28]);
  const metrics: ScoreMetric[] = [
    {
      key: "adl_score",
      label_ar: "أنشطة الحياة اليومية",
      value: scoreGroup(adlIds),
      display_ar: formatPercent(scoreGroup(adlIds)),
    },
    {
      key: "sports_score",
      label_ar: "الأنشطة الرياضية",
      value: scoreGroup(sportsIds),
      display_ar: formatPercent(scoreGroup(sportsIds)),
    },
  ];

  if (currentFunction !== null) {
    metrics.push({
      key: "current_function",
      label_ar: "التقييم الذاتي الحالي للوظيفة",
      value: currentFunction,
      display_ar: String(currentFunction),
    });
  }

  return {
    status: "ready",
    metrics,
    direction_ar: "الدرجة الأعلى أفضل.",
    note_ar: "تم استبعاد إجابات X من مقام احتساب FAAM وفق ملف الإكسل المحلي.",
  };
}

function scoreAOS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 18);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const painIds = questionIds.slice(0, 9);
  const difficultyIds = questionIds.slice(9, 18);

  const painScore = (sumNumeric(painIds, answers) / 90) * 100;
  const difficultyScore = (sumNumeric(difficultyIds, answers) / 90) * 100;
  const totalScore = (painScore + difficultyScore) / 2;

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
        key: "difficulty_subscore",
        label_ar: "درجة الصعوبة",
        value: difficultyScore,
        display_ar: formatPercent(difficultyScore),
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
      "تم تفعيل AOS من الصورة المرسلة: كل قسم يُحتسب بالمعادلة (مجموع الإجابات / 90) × 100، ثم أُخذ متوسط القسمين كدرجة كلية.",
  };
}

function scoreBFS(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const scoredQuestions = questions.slice(1);
  const requiredIds = scoredQuestions.map((question) => question.id);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);
  const minPossible = scoredQuestions.reduce((sum, question) => {
    const values = getNumericOptionValues(question);
    return sum + Math.min(...values);
  }, 0);
  const maxPossible = scoredQuestions.reduce((sum, question) => {
    const values = getNumericOptionValues(question);
    return sum + Math.max(...values);
  }, 0);

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
      "تم تفعيل BFS من ورقة score calculation المحلية. السؤال الأول مستبعد من الحساب كما هو مذكور في الملف. ولأن القيم الظاهرة لا تبدأ من الصفر، تم تطبيع النتيجة إلى نطاق 0–100 بحيث تبقى 0 = أفضل حالة و100 = أسوأ حالة كما تنص الورقة.",
  };
}

function scoreBournemouthNeck(
  questionIds: string[],
  answers: Record<string, OptionValue>,
): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 7);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);
  const percent = (raw / 70) * 100;

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
        display_ar: formatRaw(raw, 70),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل Bournemouth Neck من الصورة المرسلة: score calculation = (raw score / total) × 100، و0/70 أفضل حالة و70/70 أسوأ حالة.",
  };
}

function scoreDHI(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 18);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);
  const percent = (raw / 90) * 100;

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
        display_ar: formatRaw(raw, 90),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل DHI من الصورة المرسلة: score calculation = (raw score / total) × 100. وبما أن الملف الحالي يحتوي 18 سؤالًا بدرجات 0 إلى 5، فالمجموع الكلي يساوي 90.",
  };
}

function scoreEdinburgh(
  questions: QuestionItem[],
  answers: Record<string, OptionValue>,
): ScoreOutcome {
  const requiredQuestions = questions.slice(0, 6);
  const missingCount = getMissingCount(
    requiredQuestions.map((question) => question.id),
    answers,
  );
  if (missingCount) return buildIncomplete(missingCount);

  const [q1, q2, q3, q4, q5, q6] = requiredQuestions;
  const q1Label = getSelectedOption(q1, answers)?.label_ar ?? "";
  const q2Label = getSelectedOption(q2, answers)?.label_ar ?? "";
  const q3Label = getSelectedOption(q3, answers)?.label_ar ?? "";
  const q4Label = getSelectedOption(q4, answers)?.label_ar ?? "";
  const q5Label = getSelectedOption(q5, answers)?.label_ar ?? "";
  const q6Label = getSelectedOption(q6, answers)?.label_ar ?? "";

  const coreCriteriaMet =
    q1Label.includes("نعم") &&
    q2Label.includes("لا") &&
    q3Label.includes("نعم") &&
    q5Label.includes("نعم");
  const hasCalfPain = q6Label.includes("الساق");
  const hasThighOrButtockPain = q6Label.includes("الفخذ") || q6Label.includes("الأرداف");
  const grade = q4Label.includes("نعم") ? 2 : 1;

  let interpretation = "لا يوجد عرج متقطع";
  let value = 0;

  if (coreCriteriaMet && hasCalfPain) {
    interpretation = "عرج متقطع مؤكد";
    value = 2;
  } else if (coreCriteriaMet && hasThighOrButtockPain) {
    interpretation = "عرج متقطع غير نمطي";
    value = 1;
  }

  const metrics: ScoreMetric[] = [
    {
      key: "interpretation",
      label_ar: "النتيجة",
      value,
      display_ar: interpretation,
    },
  ];

  if (coreCriteriaMet) {
    metrics.push({
      key: "grade",
      label_ar: "الدرجة",
      value: grade,
      display_ar: `الدرجة ${grade}`,
    });
  }

  return {
    status: "ready",
    metrics,
    direction_ar: "هذا الاستبيان يعطي تصنيفًا سريريًا وليس مجموعًا رقميًا.",
    note_ar:
      "تم تفعيل Edinburgh من الصورة المرسلة: إذا تحققت أسئلة 1 و3 و5 بنعم، والسؤال 2 بلا، وكان موضع الألم يشمل الساق فالتصنيف عرج متقطع مؤكد. وإذا تحققت الشروط نفسها مع ألم في الفخذ أو الأرداف فقط فالتصنيف عرج متقطع غير نمطي.",
  };
}

function scorePSS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 25);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const painIds = questionIds.slice(0, 3);
  const satisfactionId = questionIds[3];
  const functionIds = questionIds.slice(5, 25);

  const painRaw = sumNumeric(painIds, answers);
  const painContribution = 30 - painRaw;
  const satisfaction = getNumericAnswer(answers, satisfactionId) ?? 0;

  const functionRaw = sumNumeric(functionIds, answers);
  const xCount = functionIds.reduce(
    (count, id) => count + (getAnsweredValue(answers, id) === "X" ? 1 : 0),
    0,
  );
  const adjustedFunctionMax = 60 - xCount * 3;
  const functionScore =
    adjustedFunctionMax > 0 ? (functionRaw / adjustedFunctionMax) * 60 : 0;

  const totalScore = painContribution + satisfaction + functionScore;

  return {
    status: "ready",
    metrics: [
      {
        key: "pain_score",
        label_ar: "درجة الألم",
        value: painRaw,
        display_ar: formatRaw(painRaw, 30),
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
        display_ar: formatPercent(totalScore),
      },
    ],
    direction_ar: "الدرجة الكلية الأعلى أفضل.",
    note_ar:
      "تم تفعيل PSS من ورقة Score calculation المحلية. تم احتساب الوظيفة كما في الملف: [sum of answers / (60 - 3×عدد X)] × 60. ولأن الألم في الورقة مُرمّز من 0 = لا ألم إلى 10 = أسوأ ألم، استُخدم مكوّن ألم معكوس (30 - مجموع الألم) عند حساب الدرجة الكلية حتى تبقى النتيجة الكلية من 100 وباتجاه واحد.",
  };
}

function scoreHOOS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 40);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const groups = [
    {
      key: "symptoms",
      label_ar: "الأعراض",
      ids: questionIds.slice(0, 5),
      denominator: 20,
    },
    {
      key: "pain",
      label_ar: "الألم",
      ids: questionIds.slice(5, 15),
      denominator: 40,
    },
    {
      key: "adl_function",
      label_ar: "الوظيفة في الحياة اليومية",
      ids: questionIds.slice(15, 32),
      denominator: 68,
    },
    {
      key: "sport_recreation",
      label_ar: "الوظائف الرياضية والترفيهية",
      ids: questionIds.slice(32, 36),
      denominator: 16,
    },
    {
      key: "quality_of_life",
      label_ar: "جودة الحياة",
      ids: questionIds.slice(36, 40),
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
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل HOOS من ورقة Score Calculation المحلية كما هي: كل مقياس فرعي = (مجموع الإجابات / المقام) × 100، مع تفسير نهائي في الورقة يقول إن الدرجة الأقل تعني حالة أفضل.",
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

  return {
    status: "ready",
    metrics,
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل HOOS-12 من ورقة Score calculation المحلية: كل مقياس فرعي = (مجموع الإجابات / 16) × 100.",
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
        display_ar: formatPercent(converted),
      },
    ],
    direction_ar: "الدرجة المحولة الأعلى أفضل.",
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
    ],
    direction_ar: "الدرجة الأقل أفضل.",
  };
}

function scoreLLTQ(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const adlAbilityIds = questionIds.slice(0, 20).filter((_, index) => index % 2 === 0);
  const sportAbilityIds = questionIds.slice(20, 40).filter((_, index) => index % 2 === 0);
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
        label_ar: "أنشطة الحياة اليومية",
        value: adlPercent,
        display_ar: formatPercent(adlPercent),
      },
      {
        key: "sport_subscore",
        label_ar: "الأنشطة الأعلى مستوى",
        value: sportPercent,
        display_ar: formatPercent(sportPercent),
      },
    ],
    direction_ar: "الدرجة الأعلى أفضل.",
    note_ar: "تم احتساب النتيجة من أسئلة القدرة فقط كما هو موضح في ملف الإكسل المحلي.",
  };
}

function scoreQBS(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 20);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = sumNumeric(requiredIds, answers);

  return {
    status: "ready",
    metrics: [
      {
        key: "total_score",
        label_ar: "المجموع الكلي",
        value: raw,
        display_ar: formatRaw(raw, 100),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
  };
}

function scoreIHOT12(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredIds = questionIds.slice(0, 12);
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
        display_ar: formatPercent(percent),
      },
    ],
    direction_ar: "الدرجة الأعلى أفضل.",
  };
}

function scoreIHOT33(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const workQuestions = questions.slice(22, 26);
  const nonWorkQuestions = [...questions.slice(0, 22), ...questions.slice(26)];
  const workAnsweredCount = workQuestions.filter((question) => question.id in answers).length;
  const skipWorkSection = workAnsweredCount === 0;

  const requiredQuestions = skipWorkSection ? nonWorkQuestions : [...nonWorkQuestions, ...workQuestions];
  const requiredIds = requiredQuestions.map((question) => question.id);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const raw = requiredQuestions.reduce((sum, question) => {
    const answer = answers[question.id];
    return typeof answer === "number" ? sum + answer : sum;
  }, 0);

  const denominator = requiredQuestions.reduce((sum, question) => {
    const answer = answers[question.id];
    if (answer === "X") return sum;
    const values = getNumericOptionValues(question);
    return sum + (values.length ? Math.max(...values) : 0);
  }, 0);

  const percent = denominator > 0 ? (raw / denominator) * 100 : 0;
  const xCount = requiredQuestions.reduce(
    (count, question) => count + (answers[question.id] === "X" ? 1 : 0),
    0,
  );

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
        display_ar: formatRaw(raw, denominator),
      },
    ],
    direction_ar: "الدرجة الأعلى أفضل.",
    note_ar: skipWorkSection
      ? `تم احتساب iHOT-33 مع تخطي قسم العمل بالكامل لأن أسئلة العمل الأربعة تُركت بدون إجابة. كما تم استبعاد ${xCount} سؤال/أسئلة بعلامة X من المقام وفق ورقة Score Calculation المحلية.`
      : `تم احتساب iHOT-33 مع استبعاد ${xCount} سؤال/أسئلة بعلامة X من المقام وفق ورقة Score Calculation المحلية. وبسبب عدم اتساق المقام المطبوع (120/80) مع بنية الـ 33 سؤالًا الظاهرة، استُخدم المقام الفعلي المبني على الأسئلة المُجابة عدديًا في الملف الحالي.`,
  };
}

function scoreSFI(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredQuestions = questions.slice(0, 25);
  const requiredIds = requiredQuestions.map((question) => question.id);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  let raw = 0;
  for (const question of requiredQuestions) {
    const value = mapYesPartlyNo(question, answers);
    if (value === null) {
      return {
        status: "unsupported",
        note_ar: "تعذر مطابقة إحدى إجابات نعم/جزئيًا/لا مع ورقة الاحتساب المحلية.",
      };
    }
    raw += value;
  }

  const percent = (raw / 50) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "sfi_percent",
        label_ar: "درجة SFI",
        value: percent,
        display_ar: formatPercent(percent),
      },
      {
        key: "raw_score",
        label_ar: "المجموع الخام",
        value: raw,
        display_ar: formatRaw(raw, 50),
      },
    ],
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل SFI من ورقة Score Calculation المحلية: نعم = 2، جزئيًا = 1، لا = 0، ثم تُحسب النتيجة بالمعادلة (المجموع الخام / 50) × 100.",
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

function scoreZurich(questions: QuestionItem[], answers: Record<string, OptionValue>): ScoreOutcome {
  const requiredQuestions = questions.slice(0, 18);
  const requiredIds = requiredQuestions.map((question) => question.id);
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const groups = [
    {
      key: "symptom_subscore",
      label_ar: "شدة الأعراض",
      questions: questions.slice(0, 7),
    },
    {
      key: "function_subscore",
      label_ar: "الوظيفة الجسدية",
      questions: questions.slice(7, 12),
    },
    {
      key: "satisfaction_subscore",
      label_ar: "الرضا بعد العملية",
      questions: questions.slice(12, 18),
    },
  ] as const;

  const metrics: ScoreMetric[] = groups.map((group) => {
    const ids = group.questions.map((question) => question.id);
    const raw = sumNumeric(ids, answers);
    const max = group.questions.reduce((sum, question) => {
      const values = getNumericOptionValues(question);
      return sum + (values.length ? Math.max(...values) : 0);
    }, 0);
    const percent = max > 0 ? (raw / max) * 100 : 0;
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
    direction_ar: "الدرجة الأقل أفضل.",
    note_ar:
      "تم تفعيل Zurich من ورقة Score Calculation المحلية، لكن نفس الورقة تحتوي عدم تطابق بين المعادلات المكتوبة وعدد الأسئلة الظاهر في كل قسم. لذلك استُخدمت كتل الأسئلة الظاهرة نفسها في الملف الحالي: 7 أسئلة للأعراض، 5 للوظيفة، و6 للرضا، مع تطبيع كل قسم على أقصى مجموع ظاهر له حتى تبقى النتيجة ضمن 0–100.",
  };
}

function scoreMHQ(questionIds: string[], answers: Record<string, OptionValue>): ScoreOutcome {
  const generalFunctionIds = questionIds.slice(0, 10);
  const activityIds = questionIds.slice(10, 27);
  const workIds = questionIds.slice(27, 32);
  const painRightIds = questionIds.slice(32, 37);
  const painLeftIds = questionIds.slice(37, 42);
  const appearanceIds = questionIds.slice(42, 50);
  const satisfactionIds = questionIds.slice(50, 62);

  const requiredIds = [
    ...generalFunctionIds,
    ...activityIds,
    ...workIds,
    painRightIds[0],
    painLeftIds[0],
    ...(getNumericAnswer(answers, painRightIds[0]) === 5 ? [] : painRightIds.slice(1)),
    ...(getNumericAnswer(answers, painLeftIds[0]) === 5 ? [] : painLeftIds.slice(1)),
    ...appearanceIds,
    ...satisfactionIds,
  ];
  const missingCount = getMissingCount(requiredIds, answers);
  if (missingCount) return buildIncomplete(missingCount);

  const subscore1Raw = sumNumeric([...generalFunctionIds, ...activityIds], answers);
  const subscore1 = ((subscore1Raw - 5) / 130) * 100;

  const subscore2Raw = sumNumeric(workIds, answers);
  const subscore2 = ((subscore2Raw - 5) / 20) * 100;

  const rightHasNoPain = getNumericAnswer(answers, painRightIds[0]) === 5;
  const leftHasNoPain = getNumericAnswer(answers, painLeftIds[0]) === 5;
  const painSeverityIds = new Set([painRightIds[1], painLeftIds[1]]);
  const recodePainId = (id: string) => {
    const value = getNumericAnswer(answers, id) ?? 0;
    return painSeverityIds.has(id) ? reverseFivePoint(value) : value;
  };

  let subscore3Raw = 0;
  let subscore3Denominator = 50;
  if (rightHasNoPain && leftHasNoPain) {
    subscore3Raw = (getNumericAnswer(answers, painRightIds[0]) ?? 0) + (getNumericAnswer(answers, painLeftIds[0]) ?? 0);
    subscore3Denominator = 5;
  } else if (rightHasNoPain) {
    subscore3Raw = painLeftIds.reduce((sum, id) => sum + recodePainId(id), 0);
    subscore3Denominator = 20;
  } else if (leftHasNoPain) {
    subscore3Raw = painRightIds.reduce((sum, id) => sum + recodePainId(id), 0);
    subscore3Denominator = 20;
  } else {
    subscore3Raw = [...painRightIds, ...painLeftIds].reduce((sum, id) => sum + recodePainId(id), 0);
  }
  const subscore3 = ((subscore3Raw - 5) / subscore3Denominator) * 100;

  const appearancePositiveIds = new Set([appearanceIds[0], appearanceIds[4]]);
  const subscore4Raw = appearanceIds.reduce((sum, id) => {
    const value = getNumericAnswer(answers, id) ?? 0;
    return sum + (appearancePositiveIds.has(id) ? reverseFivePoint(value) : value);
  }, 0);
  const subscore4 = ((subscore4Raw - 5) / 35) * 100;

  const subscore5Raw = satisfactionIds.reduce((sum, id) => {
    const value = getNumericAnswer(answers, id) ?? 0;
    return sum + reverseFivePoint(value);
  }, 0);
  const subscore5 = ((subscore5Raw - 5) / 55) * 100;

  return {
    status: "ready",
    metrics: [
      {
        key: "hand_function",
        label_ar: "الوظيفة والأنشطة",
        value: subscore1,
        display_ar: formatPercent(subscore1),
      },
      {
        key: "work_performance",
        label_ar: "الأداء في العمل",
        value: subscore2,
        display_ar: formatPercent(subscore2),
      },
      {
        key: "pain",
        label_ar: "الألم",
        value: subscore3,
        display_ar: formatPercent(subscore3),
      },
      {
        key: "appearance",
        label_ar: "المظهر",
        value: subscore4,
        display_ar: formatPercent(subscore4),
      },
      {
        key: "satisfaction",
        label_ar: "الرضا",
        value: subscore5,
        display_ar: formatPercent(subscore5),
      },
    ],
    direction_ar:
      "في ورقة الحل المحلية: Subscore 1 الأقل أفضل، أما Subscores 2 إلى 5 فالأعلى أفضل.",
    note_ar:
      "تم تفعيل MHQ من ورقة Score Calculation المحلية مباشرة. استُخدمت كتل الصفوف كما تظهر في الورقة، وطُبقت قاعدة تخطي الألم إذا كانت إجابة سؤال الألم الأول في اليد = أبدًا، كما أُعيد ترميز العناصر ذات الصياغة المعكوسة فقط حتى يبقى اتجاه Subscores 2 إلى 5 متوافقًا مع ملاحظة الورقة.",
  };
}

export function scoreQuestionnaire(
  q: Questionnaire,
  answers: Record<string, OptionValue>,
): ScoreOutcome {
  const questions = getQuestions(q);
  const questionIds = questions.map((question) => question.id);

  switch (q.id) {
    case "AOS":
      return scoreAOS(questionIds, answers);
    case "BFS":
      return scoreBFS(questions, answers);
    case "Bournemouth Neck":
      return scoreBournemouthNeck(questionIds, answers);
    case "DHI":
      return scoreDHI(questionIds, answers);
    case "Edinburgh":
      return scoreEdinburgh(questions, answers);
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
    case "SFI":
      return scoreSFI(questions, answers);
    case "Zurich":
      return scoreZurich(questions, answers);
    case "HOOS-JR":
      return scoreJR(questionIds.slice(0, 6), answers, HOOS_JR_LOOKUP, 24);
    case "HOOS-PS":
      return scoreHOOSPS(questionIds, answers);
    case "KOOS-JR":
      return scoreJR(questionIds.slice(0, 7), answers, KOOS_JR_LOOKUP, 28);
    case "LLTQ":
      return scoreLLTQ(questionIds, answers);
    case "QBS":
      return scoreQBS(questionIds, answers);
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
