export type Option = {
  value: string | number;
  label_ar: string;
};

export type Question = {
  id: string;
  text_ar: string;
  options?: Option[]; // optional override
};

export type Questionnaire = {
  id: string; // "AOS", "KOOS-JR", ...
  name: string;
  title_ar: string;
  instructions_ar?: string;
  default_options: Option[];
  questions: Question[];
};

export type Answer = {
  value: string | number;
  label_ar: string;
};

export type ProgressPayload = {
  qid: string;
  index: number;
  answers: Record<string, Answer>;
  savedAt: string;
};