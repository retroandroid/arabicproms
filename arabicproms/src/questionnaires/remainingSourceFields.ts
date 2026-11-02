import type { PatientField } from "./patientFields";

// Fields from the supplied worksheets; record-number fields remain removed.
export const REMAINING_HEADER_FIELDS: Record<string, PatientField[]> = {
  "DHI": [
    {"id": "name", "label_ar": "اسم  المريض", "type": "text"},
    {"id": "birthDate", "label_ar": "تاريخ الولادة", "type": "date"},
    {"id": "gender", "label_ar": "الجنس", "type": "radio", "options": ["ذكر", "أنثى"]},
    {"id": "phone", "label_ar": "رقم الهاتف", "type": "tel"},
    {"id": "dominantHand", "label_ar": "اليد المهيمنة", "type": "radio", "options": ["يمين", "يسار", "كليهما"]},
  ],
  "LLTQ": [
    {"id": "name", "label_ar": "اسم  المريض", "type": "text"},
    {"id": "birthDate", "label_ar": "تاريخ الولادة", "type": "date"},
  ],
  "KOOS-12": [
    {"id": "name", "label_ar": "اسم  المريض", "type": "text"},
    {"id": "birthDate", "label_ar": "تاريخ الولادة", "type": "date"},
    {"id": "gender", "label_ar": "الجنس", "type": "radio", "options": ["ذكر", "أنثى"]},
    {"id": "dominantLeg", "label_ar": "السّاق المهيمنة", "type": "radio", "options": ["يمين", "يسار", "كليهما"]},
  ],
  "KOOS-JR": [
    {"id": "name", "label_ar": "اسم  المريض", "type": "text"},
    {"id": "visitDate", "label_ar": "التاريخ", "type": "date"},
    {"id": "affectedKnee", "label_ar": "الركبة المصابة", "type": "radio", "options": ["يمنى", "يسرى"]},
  ],
  "MHQ": [
    {"id": "name", "label_ar": "اسم  المريض", "type": "text"},
    {"id": "birthDate", "label_ar": "تاريخ الولادة", "type": "date"},
    {"id": "phone", "label_ar": "رقم الهاتف", "type": "tel"},
    {"id": "dominantHand", "label_ar": "اليد المهيمنة", "type": "radio", "options": ["يمين", "يسار", "كليهما"]},
  ],
};

export const SOURCE_FOLLOWUP_FIELDS: Record<string, { title_ar: string; fields: PatientField[] }> = {
  MHQ: {
    title_ar: "ز) یرجى تقدیم المعلومات التالیة عن نفسك (یرجى تحدید إجابة واحدة لكل سؤال)",
    fields: [
      {"id": "ethnicity", "label_ar": "2. ما هي خلفیتك العرقیة؟", "type": "radio", "options": ["لیس من أصل اسباني أو لاتیني", "من أصل اسباني أو لاتیني"], "required": false},
      {"id": "race", "label_ar": "3. ما ھي خلفیتك العرقیة؟ یرجى التحدید إذا لیست بین الخیارات", "type": "radio", "options": ["أمریكي ھندي أو من سكان ألاسكا الأصلیین", "آسیوي", "سكان ھاواي الأصلیون أو أي من سكان جزر المحیط الھادئ الأخرى", "أسود أو أمریكي من أصل أفریقي", "أبیض", "خلفية عرقية أخرى: __________"], "required": false},
      {"id": "otherRace", "label_ar": "خلفية عرقية أخرى", "type": "text", "required": false, "when": {"field": "race", "value": "خلفية عرقية أخرى: __________"}},
      {"id": "returnToWorkA", "label_ar": "4.أ) كم من الوقت بعد الجراحة مرّ قبل أن تعد إلى العمل؟", "type": "text", "required": false},
      {"id": "currentWork", "label_ar": "4.ب) یرجى وصف نوع العمل الذي تقوم بھ الآن", "type": "text", "required": false},
      {"id": "returnToWork", "label_ar": "5. كم من الوقت بعد الجراحة مرّ قبل أن تعد إلى العمل؟", "type": "text", "required": false},
      {"id": "sameJob", "label_ar": "6. كم من الوقت بعد الجراحة عدت إلى نفس الوظیفة التي كنت تقوم بھا قبل إصابتك؟", "type": "text", "required": false},
      {"id": "gender", "label_ar": "7. ما ھو جنسك؟", "type": "radio", "options": ["ذكر", "أنثى"], "required": false},
      {"id": "education", "label_ar": "8. ما ھو أعلى مستوى تعلیمي تلقیتھ؟", "type": "radio", "options": ["أقل من خریج ثانویة عامة", "خریج المدرسة الثانویة", "المدرسة المھنیة/التقنیة", "خریج جامعة", "حائز على ماجیستر", "الدراسات العلیا"], "required": false},
      {"id": "income", "label_ar": "9. ما ھو دخلك الأسري التقریبي بما في ذلك الأجور، دفعات العجز، دخل التقاعد والرفاه؟", "type": "radio", "options": ["أقل من 10،000 دولار", "10،000 دولارًا – 19،999 دولار", "20،000 دولارًا – 29،999 دولار", "30،000 دولارًا – 39،999 دولار", "40،000 دولارًا – 49،999 دولار", "50،000 دولارًا – 59،999 دولار", "60،000 دولارًا – 69،999 دولار", "أكثر من 70،000 دولار"], "required": false},
    ],
  },
};
