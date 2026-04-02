export type OptionValue = string | number;

export type Option = { value: OptionValue; label_ar: string };

export type SectionItem = {
  type: "section";
  id: string;
  title_ar: string;
};

export type QuestionItem = {
  type: "question";
  id: string;
  text_ar: string;
  options: Option[];
};

export type Item = SectionItem | QuestionItem;

export type Questionnaire = {
  id: string;       // filename without .csv
  title_ar: string; // inferred from first section or filename
  items: Item[];
};

export type QuestionnaireSource = "builtin" | "user";
