import { REMAINING_HEADER_FIELDS } from "./remainingSourceFields";

export type PatientField = {
  id: string;
  label_ar: string;
  required?: boolean;
  when?: { field: string; value: string };
} & ({
  type: "text" | "date" | "tel";
  autoComplete?: string;
} | {
  type: "number";
  min: number;
  step: number;
} | {
  type: "radio";
  options: readonly string[];
});

export const DOMINANT_HAND_FIELD = {
  id: "dominantHand",
  label_ar: "اليد المهيمنة",
  type: "radio" as const,
  options: ["اليمنى", "اليسرى", "كلاهما"],
};

const PDF_PATIENT_FIELDS: PatientField[] = [
  { id: "name", label_ar: "اسم المريض", type: "text", autoComplete: "name" },
  { id: "birthDate", label_ar: "تاريخ الولادة", type: "date", autoComplete: "bday" },
  { id: "gender", label_ar: "الجنس", type: "text" },
  { id: "phone", label_ar: "رقم الهاتف", type: "tel", autoComplete: "tel" },
];

const AFFECTED_FOOT_ANKLE: PatientField = {
  id: "affectedSide", label_ar: "القدم / الكاحل المصاب", type: "radio",
  options: ["اليمين", "اليسار", "كلاهما"],
};

const AFFECTED_HAND: PatientField = {
  id: "affectedHand", label_ar: "اليد المصابة", type: "radio",
  options: ["اليمنى", "اليسرى", "كلاهما"],
};
const AFFECTED_HIP: PatientField = {
  id: "affectedSide", label_ar: "الورك المصاب", type: "radio",
  options: ["اليمين", "اليسار", "كلاهما"],
};
const AFFECTED_LEG: PatientField = {
  id: "affectedSide", label_ar: "الطرف السفلي المصاب", type: "radio",
  options: ["اليمين", "اليسار", "كلاهما"],
};

const SPINE_PATIENT_FIELDS: PatientField[] = [
  { id: "name", label_ar: "اسم المريض", type: "text", autoComplete: "name" },
  { id: "age", label_ar: "العمر (بالسنوات)", type: "number", min: 0, step: 1 },
  { id: "gender", label_ar: "الجنس", type: "radio", options: ["ذكر", "أنثى"] },
  { id: "phone", label_ar: "رقم الهاتف", type: "tel", autoComplete: "tel" },
];

// Source headers are kept separate so demographics never shift scored question IDs.
export const SOURCE_PATIENT_FIELDS: Record<string, PatientField[]> = {
  ...REMAINING_HEADER_FIELDS,
  DHI: [
    ...REMAINING_HEADER_FIELDS.DHI,
    AFFECTED_HAND,
  ],
  MHQ: [...REMAINING_HEADER_FIELDS.MHQ, AFFECTED_HAND],
  LLTQ: [...REMAINING_HEADER_FIELDS.LLTQ, AFFECTED_LEG],
  "KOOS-12": [
    ...REMAINING_HEADER_FIELDS["KOOS-12"],
    { id: "affectedKnee", label_ar: "الركبة المصابة", type: "radio", options: ["يمنى", "يسرى", "كلتاهما"] },
  ],
  "KOOS-JR": REMAINING_HEADER_FIELDS["KOOS-JR"].map((field): PatientField => field.id === "affectedKnee"
    ? { ...field, type: "radio", options: ["يمنى", "يسرى", "كلتاهما"] } : field),
  "HOOS-12": [AFFECTED_HIP],
  "HOOS-PS": [AFFECTED_HIP],
  "HOOS-JR": [AFFECTED_HIP],
  "iHOT-33": [AFFECTED_HIP],
  SFI: SPINE_PATIENT_FIELDS,
  "SFI-10": SPINE_PATIENT_FIELDS,
  QBS: SPINE_PATIENT_FIELDS,
  AOS: [AFFECTED_FOOT_ANKLE],
  BFS: [AFFECTED_FOOT_ANKLE],
  FAAM: [PDF_PATIENT_FIELDS[0], PDF_PATIENT_FIELDS[1], AFFECTED_FOOT_ANKLE],
  FAOS: [
    ...PDF_PATIENT_FIELDS.map((field): PatientField => field.id === "gender"
      ? { ...field, type: "radio", options: ["ذكر", "أنثى"] } : field),
    { id: "dominantLeg", label_ar: "الساق المهيمنة", type: "radio", options: ["اليمنى", "اليسرى", "كلاهما"] },
    AFFECTED_FOOT_ANKLE,
  ],
  HOOS: [
    { id: "name", label_ar: "اسم المريض", type: "text", autoComplete: "name" },
    { id: "visitDate", label_ar: "التاريخ", type: "date" },
  ],
  "iHOT-12": [
    { id: "visitDate", label_ar: "التاريخ (إملاء إمّا تاريخ المراجعة أو فترة المتابعة)", type: "text" },
    { id: "name", label_ar: "اسم المريض", type: "text", autoComplete: "name" },
    { id: "followUp", label_ar: "فترة المتابعة: قبل العملية أو ______ أسابيع / أشهر / سنوات", type: "text" },
  ],
  "Bournemouth Neck": PDF_PATIENT_FIELDS,
  CPGS: PDF_PATIENT_FIELDS,
  Zurich: [...PDF_PATIENT_FIELDS, AFFECTED_LEG],
  Edinburgh: [...PDF_PATIENT_FIELDS, AFFECTED_LEG],
};
