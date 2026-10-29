export type PatientField = {
  id: string;
  label_ar: string;
} & ({
  type: "text" | "date" | "tel";
  autoComplete?: string;
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

// Source headers are kept separate so demographics never shift scored question IDs.
export const SOURCE_PATIENT_FIELDS: Record<string, PatientField[]> = {
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
    { id: "medicalRecord", label_ar: "رقم الملف الطبي للمريض", type: "text" },
    { id: "visitDate", label_ar: "التاريخ", type: "date" },
  ],
  "Bournemouth Neck": PDF_PATIENT_FIELDS,
  "Neck Forms": PDF_PATIENT_FIELDS,
  CPGS: PDF_PATIENT_FIELDS,
  Zurich: [...PDF_PATIENT_FIELDS, DOMINANT_HAND_FIELD],
  Edinburgh: PDF_PATIENT_FIELDS,
};
