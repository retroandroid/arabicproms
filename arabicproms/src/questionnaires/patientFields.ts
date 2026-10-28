export type PatientField = {
  id: string;
  label_ar: string;
  type: "text" | "date" | "tel";
  autoComplete?: string;
};

const PDF_PATIENT_FIELDS: PatientField[] = [
  { id: "name", label_ar: "اسم المريض", type: "text", autoComplete: "name" },
  { id: "birthDate", label_ar: "تاريخ الولادة", type: "date", autoComplete: "bday" },
  { id: "gender", label_ar: "الجنس", type: "text" },
  { id: "phone", label_ar: "رقم الهاتف", type: "tel", autoComplete: "tel" },
];

// Source headers are kept separate so demographics never shift scored question IDs.
export const SOURCE_PATIENT_FIELDS: Record<string, PatientField[]> = {
  HOOS: [
    { id: "name", label_ar: "اسم المريض", type: "text", autoComplete: "name" },
    { id: "medicalRecord", label_ar: "رقم الملف الطبي للمريض", type: "text" },
    { id: "visitDate", label_ar: "التاريخ", type: "date" },
  ],
  "Bournemouth Neck": PDF_PATIENT_FIELDS,
  "Neck Forms": PDF_PATIENT_FIELDS,
  CPGS: PDF_PATIENT_FIELDS,
  Zurich: PDF_PATIENT_FIELDS,
  Edinburgh: PDF_PATIENT_FIELDS,
};
