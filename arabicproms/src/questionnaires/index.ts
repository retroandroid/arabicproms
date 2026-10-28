import type { Questionnaire } from "../core/types";
import { parseZurichCsvText } from "../core/csvZurich";
import { SCORED_QUESTION_COUNTS } from "../core/questionnaireValidation";

export async function loadBuiltinQuestionnaires(): Promise<Questionnaire[]> {
  const manRes = await fetch("/questionnaires/manifest.json", { cache: "no-store" });
  if (!manRes.ok) throw new Error("Cannot load /questionnaires/manifest.json");

  const manifest: unknown = await manRes.json();
  if (typeof manifest !== "object" || manifest === null || !("files" in manifest) ||
    !Array.isArray(manifest.files) || manifest.files.length === 0 ||
    !manifest.files.every((file): file is string => typeof file === "string" && /^[^/\\]+\.csv$/i.test(file)) ||
    new Set(manifest.files).size !== manifest.files.length) {
    throw new Error("Invalid questionnaire manifest");
  }

  const out: Questionnaire[] = [];
  for (const file of manifest.files) {
    const res = await fetch(`/questionnaires/${encodeURIComponent(file)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Cannot load questionnaire: ${file}`);
    const text = await res.text();

    const id = file.replace(/\.csv$/i, "");
    const questionnaire = parseZurichCsvText(text, id);
    const expected = Object.hasOwn(SCORED_QUESTION_COUNTS, id) ? SCORED_QUESTION_COUNTS[id] : undefined;
    if (expected !== undefined && questionnaire.items.filter((item) => item.type === "question").length !== expected) {
      throw new Error(`Incomplete questionnaire: ${file}`);
    }
    out.push(questionnaire);
  }

  return out;
}
