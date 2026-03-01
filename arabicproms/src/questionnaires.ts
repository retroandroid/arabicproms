import type { Questionnaire, Option, Question } from "./types.ts";

const likert5: Option[] = [
  { value: 0, label_ar: "أبدًا" },
  { value: 1, label_ar: "نادرًا" },
  { value: 2, label_ar: "أحيانًا" },
  { value: 3, label_ar: "غالبًا" },
  { value: 4, label_ar: "دائمًا" },
];

// helper placeholder generator (replace later)
const makePlaceholderQs = (count: number, prefix: string): Question[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    text_ar: `سؤال تجريبي رقم ${i + 1} — استبدله بسؤالك العربي`,
  }));

export const QUESTIONNAIRES: Questionnaire[] = [
  { id:"AOS", name:"AOS", title_ar:"AOS", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"AOS_") },
  { id:"BFS", name:"BFS", title_ar:"BFS", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"BFS_") },
  { id:"BournemouthNeck", name:"BournemouthNeck", title_ar:"Bournemouth Neck", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"BN_") },
  { id:"DuruozHandIndex", name:"Duruoz Hand Index", title_ar:"Duruoz Hand Index", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"DHI_") },
  { id:"EdinburgClaudication", name:"Edinburg Claudication", title_ar:"Edinburgh Claudication", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"EC_") },

  { id:"FAAM", name:"FAAM", title_ar:"FAAM", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"FAAM_") },
  { id:"FAOS", name:"FAOS", title_ar:"FAOS", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"FAOS_") },

  { id:"HOOS", name:"HOOS", title_ar:"HOOS", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"HOOS_") },
  { id:"HOOS-12", name:"HOOS-12", title_ar:"HOOS-12", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"HOOS12_") },
  { id:"HOOS-JR", name:"HOOS-JR", title_ar:"HOOS-JR", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"HOOSJR_") },
  { id:"HOOS-PS", name:"HOOS-PS", title_ar:"HOOS-PS", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"HOOSPS_") },

  { id:"iHOT-12", name:"iHOT-12", title_ar:"iHOT-12", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"iHOT12_") },
  { id:"iHOT-33", name:"iHOT-33", title_ar:"iHOT-33", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"iHOT33_") },

  { id:"KOOS-12", name:"KOOS-12", title_ar:"KOOS-12", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"KOOS12_") },
  { id:"KOOS-JR", name:"KOOS-JR", title_ar:"KOOS-JR", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"KOOSJR_") },

  { id:"LLTQ", name:"LLTQ", title_ar:"LLTQ", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"LLTQ_") },

  { id:"MichiganHandQuestionnaire", name:"Michigan Hand Questionnaire", title_ar:"Michigan Hand Questionnaire", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"MHQ_") },

  { id:"PennsylvaniaShoulderScore", name:"Pennsylvania Shoulder Score", title_ar:"Pennsylvania Shoulder Score", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"PSS_") },

  { id:"QuebecBackPainScore", name:"Quebec Back Pain Score", title_ar:"Quebec Back Pain Score", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"QBPS_") },

  { id:"SFI", name:"SFI", title_ar:"SFI", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"SFI_") },
  { id:"SFI-10", name:"SFI-10", title_ar:"SFI-10", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"SFI10_") },

  { id:"Zurich", name:"Zurich", title_ar:"Zurich", instructions_ar:"اختر الإجابة الأنسب لكل سؤال.", default_options: likert5, questions: makePlaceholderQs(5,"ZUR_") },
];