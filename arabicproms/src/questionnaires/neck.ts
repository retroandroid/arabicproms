import type { Item, Questionnaire } from "../core/types";

export const NECK_FORM_ID = "Neck Forms";

/** The neck PDF is one form: four patient fields, Bournemouth 5–11, CPGS 12–18. */
export function makeNeckForm(questionnaires: Questionnaire[]): Questionnaire | null {
  const bournemouth = questionnaires.find((q) => q.id === "Bournemouth Neck");
  const cpgs = questionnaires.find((q) => q.id === "CPGS");
  if (!bournemouth || !cpgs) return null;
  if ([bournemouth, cpgs].some((q) => q.items.filter((item) => item.type === "question").length !== 7)) return null;

  const items: Item[] = [];
  let number = 5;
  for (const [prefix, questionnaire, title] of [
    ["BN", bournemouth, "استبيان عنق بورنموث — Bournemouth Neck Questionnaire"],
    ["CPGS", cpgs, "استبيان مقياس درجة الألم المزمن — Chronic Pain Grade Scale (CPGS) Questionnaire"],
  ] as const) {
    items.push({ type: "section", id: `${prefix}_heading`, title_ar: title });
    for (const question of questionnaire.items) {
      if (question.type !== "question") continue;
      items.push({
        ...question, id: `${prefix}_${question.id}`,
        text_ar: `${number++}. ${question.text_ar.replace(/^\d+[.-]\s*/, "")}`,
      });
    }
  }
  return { id: NECK_FORM_ID, title_ar: "استبيانات الرقبة", items };
}
