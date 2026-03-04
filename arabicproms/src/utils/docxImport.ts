import type { Questionnaire, Option, Question } from "../types";
import * as mammoth from "mammoth";

// ---- helpers ----
const AR_TITLES: Record<string, string> = {
  AOS: "مقياس التهاب مفصل الكاحل العظمي (AOS)",
  BFS: "استبيان بريستول للقدم (BFS)",
  BNQ: "استبيان بورنماوث للرقبة (BNQ)",
  DHI: "مؤشر دوروز لليد (DHI)",
  ECQ: "استبيان العرج المتقطع في إدنبرة (ECQ)",
  FAAM: "مقياس قدرة القدم والكاحل (FAAM)",
  FAOS: "مقياس نتائج القدم والكاحل (FAOS)",
  HOOS: "مقياس نتائج إعاقة الورك والتهاب المفاصل العظمي (HOOS)",
  "HOOS-12": "HOOS-12",
  "HOOS-JR": "HOOS-JR",
  "HOOS-PS": "HOOS-PS",
  "iHOT-12": "iHOT-12",
  "iHOT-33": "iHOT-33",
  "KOOS-12": "KOOS-12",
  "KOOS-JR": "KOOS-JR",
  LLTQ: "LLTQ قائمة مهام الطرف السفلي",
  MHQ: "استبيان نتائج اليد في ميشيغان (MHQ)",
  PSS: "نقاط بنسلفانيا للكتف",
  QBF: "مقياس كيبيك لعجز آلام الظهر",
  SFI: "مؤشر الوظائف العمود الفقري (SFI)",
  "SFI-10": "SFI-10",
  ZCQ: "استبيان زيورخ للعرج المتقطع (ZCQ)",
};

function cleanLines(raw: string): string[] {
  return raw
    .replace(/\u00A0/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => {
      const x = l.toLowerCase();
      // remove scoring/interpretation blocks & filler
      if (x.startsWith("interpretation")) return false;
      if (x.includes("mcid") || x.includes("mcic") || x.includes("mdc")) return false;
      if (/^_{3,}$/.test(l)) return false;
      return true;
    });
}

// section detection (matches what appears in your doc: "(AOS)", "(BFS)", "(BNQ)", etc.)
function detectSection(line: string): string | null {
  const s = line;

  // Prefer explicit codes inside parentheses
  const m = s.match(/\((AOS|BFS|BNQ|DHI|ECQ|FAAM|FAOS|HOOS-12|HOOS|ZCQ|SFI-10|SFI)\)/i);
  if (m) return m[1].toUpperCase();

  // HOOS variants in your doc are written in English lines
  if (/HOOS-PS/i.test(s)) return "HOOS-PS";
  if (/HOOS[\s,]*JR/i.test(s)) return "HOOS-JR";
  if (/HOOS-12/i.test(s)) return "HOOS-12";
  if (/Hip disability.*\(HOOS\)/i.test(s) || /\bHOOS\b/i.test(s)) return "HOOS";

  if (/International Hip Outcome Tool.*iHOT/i.test(s) && /12/i.test(s)) return "iHOT-12";
  if (/IHOT-33/i.test(s) || /iHOT-33/i.test(s)) return "iHOT-33";

  if (/KOOS-12/i.test(s)) return "KOOS-12";
  if (/KOOS.*JR/i.test(s)) return "KOOS-JR";

  if (/Lower Limb Tasks Questionnaire/i.test(s) || /\bLLTQ\b/i.test(s)) return "LLTQ";
  if (/Michigan Hand Outcomes Questionnaire/i.test(s) || /\(MHQ\)/i.test(s)) return "MHQ";
  if (/Pennsylvania/i.test(s) && /Shoulder/i.test(s)) return "PSS";
  if (/Quebec Back/i.test(s)) return "QBF";

  return null;
}

// question detection
function isQuestionStart(line: string): boolean {
  // 1- ... / 1) ... / 1. ...
  if (/^\d+\s*[-).:]\s+/.test(line)) return true;
  // Arabic-Indic digits
  if (/^[\u0660-\u0669]+\s*[-).:]\s+/.test(line)) return true;
  // fallback: has Arabic question mark
  if (line.includes("؟")) return true;
  return false;
}

function stripQuestionNumbering(line: string): string {
  return line
    .replace(/^\d+\s*[-).:]\s+/, "")
    .replace(/^[\u0660-\u0669]+\s*[-).:]\s+/, "")
    .trim();
}

// option parsing:
// A) checkbox numeric like: ☐10 ☐9 ... ☐0
function parseCheckboxNumbers(line: string): Option[] | null {
  if (!line.includes("☐")) return null;
  const vals: Option[] = [];
  const re = /☐\s*([0-9]+)\+?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const v = Number(m[1]);
    vals.push({ value: v, label_ar: String(v) });
  }
  if (vals.length >= 2) return vals;
  // X option (FAAM)
  if (/\bX\b/.test(line)) {
    return [
      { value: "X", label_ar: "غير متاح" },
    ];
  }
  return null;
}

// B) enumerated options like: 1- لا شيء
function parseDashOptions(line: string): Option | null {
  const m = line.match(/^(\d+)\s*-\s*(.+)$/);
  if (!m) return null;
  return { value: Number(m[1]), label_ar: m[2].trim() };
}

// C) options like: قدمي لا تسبب لي أي مشكلة (1) ☐
function parseParenOption(line: string): Option | null {
  const m = line.match(/^(.+?)\s*\((\d+)\)\s*☐?$/);
  if (!m) return null;
  return { value: Number(m[2]), label_ar: m[1].trim() };
}

// default options for some known tools (fallback if we can’t parse per-question)
const DEFAULTS: Record<string, Option[]> = {
  AOS: Array.from({ length: 11 }, (_, i) => ({ value: 10 - i, label_ar: String(10 - i) })),
  BNQ: Array.from({ length: 11 }, (_, i) => ({ value: 10 - i, label_ar: String(10 - i) })),
  PSS: Array.from({ length: 11 }, (_, i) => ({ value: 10 - i, label_ar: String(10 - i) })),
  ZCQ: [1, 2, 3, 4, 5].map((v) => ({ value: v, label_ar: String(v) })),
  QBF: [0, 1, 2, 3, 4, 5].map((v) => ({ value: v, label_ar: String(v) })),
  SFI: [
    { value: "نعم", label_ar: "نعم" },
    { value: "جزئيًا", label_ar: "جزئيًا" },
    { value: "لا", label_ar: "لا" },
  ],
  "SFI-10": [
    { value: "نعم", label_ar: "نعم" },
    { value: "جزئيًا", label_ar: "جزئيًا" },
    { value: "لا", label_ar: "لا" },
  ],
  "iHOT-12": Array.from({ length: 11 }, (_, i) => ({ value: i, label_ar: String(i) })),
  "iHOT-33": Array.from({ length: 11 }, (_, i) => ({ value: i, label_ar: String(i) })),
  "KOOS-12": [0, 1, 2, 3, 4].map((v) => ({ value: v, label_ar: String(v) })),
  "KOOS-JR": [0, 1, 2, 3, 4].map((v) => ({ value: v, label_ar: String(v) })),
  DHI: [0, 1, 2, 3, 4, 5].map((v) => ({ value: v, label_ar: String(v) })),
};

export async function parseDocxToQuestionnairesFromArrayBuffer(buf: ArrayBuffer): Promise<Questionnaire[]> {
  const raw = await mammoth.extractRawText({ arrayBuffer: buf });
  const lines = cleanLines(String(raw.value ?? ""));

  const out: Questionnaire[] = [];

  let currentId: string | null = null;
  let current: Questionnaire | null = null;
  let currentQ: Question | null = null;
  let qCount = 0;

  const pushQuestion = () => {
    if (!current || !currentQ) return;
    // fallback options: if none parsed, use section defaults
    if (!currentQ.options || currentQ.options.length < 2) {
      currentQ.options = undefined;
    }
    current.questions.push(currentQ);
    currentQ = null;
  };

  const pushSection = () => {
    if (!current) return;
    pushQuestion();
    if (current.questions.length) out.push(current);
    current = null;
    currentId = null;
    qCount = 0;
  };

  // helper to attach options to current question
  const attachOptionsIfAny = (line: string) => {
    if (!currentQ) return false;

    // checkbox numeric row
    const nums = parseCheckboxNumbers(line);
    if (nums && nums.length >= 2) {
      currentQ.options = nums;
      return true;
    }

    // dash option line
    const dash = parseDashOptions(line);
    if (dash) {
      currentQ.options ??= [];
      currentQ.options.push(dash);
      return true;
    }

    // (n) option line
    const par = parseParenOption(line);
    if (par) {
      currentQ.options ??= [];
      currentQ.options.push(par);
      return true;
    }

    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const sec = detectSection(line);
    if (sec) {
      pushSection();
      currentId = sec;
      current = {
        id: sec,
        name: sec,
        title_ar: AR_TITLES[sec] ?? sec,
        instructions_ar: "اختر الإجابة الأنسب لكل سؤال.",
        default_options: DEFAULTS[sec] ?? [{ value: 0, label_ar: "0" }, { value: 1, label_ar: "1" }],
        questions: [],
      };
      continue;
    }

    if (!current) continue;

    // Start new question
    if (isQuestionStart(line)) {
      pushQuestion();
      qCount += 1;
      currentQ = {
        id: `${current.id}_${qCount}`,
        text_ar: stripQuestionNumbering(line),
      };
      continue;
    }

    // If we have an active question, try options or text continuation
    if (currentQ) {
      const usedAsOption = attachOptionsIfAny(line);

      // If it's not an option line, treat as continuation unless it's obvious non-question filler
      if (!usedAsOption) {
        // skip typical header lines inside forms
        if (
          line.includes("اسم المريض") ||
          line.includes("التاريخ") ||
          line.includes("رقم الهاتف") ||
          line.includes("معلومات عامة") ||
          line.includes("التعليمات")
        ) {
          continue;
        }

        // Some questions are “sentence then options below” (e.g., Zurich)
        // So we keep the sentence as the question text.
        currentQ.text_ar = (currentQ.text_ar + " " + line).trim();
      }

      continue;
    }

    // Zurich & some parts: a question sentence without numbering, then lines "1- ... 2- ..."
    // If we see a sentence and next line is a dash-option, create a question from it.
    const next = lines[i + 1] ?? "";
    if (!currentQ && !isQuestionStart(line) && parseDashOptions(next)) {
      qCount += 1;
      currentQ = { id: `${current.id}_${qCount}`, text_ar: line };
      continue;
    }
  }

  pushSection();
  return out;
}