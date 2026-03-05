import type { Questionnaire } from "../core/types";
import { parseZurichCsvText } from "../core/csvZurich";

type Manifest = { files: string[] };

export async function loadBuiltinQuestionnaires(): Promise<Questionnaire[]> {
  const manRes = await fetch("/questionnaires/manifest.json");
  if (!manRes.ok) throw new Error("Cannot load /questionnaires/manifest.json");

  const manifest = (await manRes.json()) as Manifest;

  const out: Questionnaire[] = [];
  for (const file of manifest.files) {
    const res = await fetch(`/questionnaires/${file}`);
    if (!res.ok) continue; // skip broken file
    const text = await res.text();

    const id = file.replace(/\.csv$/i, "");
    out.push(parseZurichCsvText(text, id));
  }

  return out;
}