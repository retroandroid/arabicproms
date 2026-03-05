import Papa from "papaparse";
import type { Questionnaire, Item, Option } from "./types";

function makeId(prefix: string, n: number) {
  return `${prefix}_${n}`;
}

function parseOptionCell(cell: string, fallbackValue: number): Option {
  const s = (cell ?? "").trim();

  // Accepts: "1- لا شيء" OR "1 - لا شيء" OR "1– لا شيء" OR "1— لا شيء"
  const m = s.match(/^(\d+)\s*[-–—]\s*(.+)$/);
  if (m) return { value: Number(m[1]), label_ar: m[2].trim() };

  // If no numeric prefix, use position-based value
  return { value: fallbackValue, label_ar: s };
}

export function parseZurichCsvText(csvText: string, fileId: string): Questionnaire {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0]?.message || "CSV parse error");
  }

  const rows = (parsed.data || []) as string[][];

  const items: Item[] = [];
  let sectionCount = 0;
  let questionCount = 0;

  for (const row of rows) {
    const cells = (row || []).map((c) => (c ?? "").trim());
    const first = (cells[0] ?? "").trim();
    if (!first) continue;

    // Remaining non-empty cells
    const rest = cells
      .slice(1)
      .map((x) => (x ?? "").trim())
      .filter((x) => x !== "");

    // Ignore any meta rows like @title, @instructions, etc.
    if (first.startsWith("@")) continue;

    // SECTION row: only first column has text
    if (rest.length === 0) {
      sectionCount++;
      items.push({
        type: "section",
        id: makeId("sec", sectionCount),
        title_ar: first.replace(/\s*\.+\s*$/, "").trim(),
      });
      continue;
    }

    // QUESTION row: first column is question text, rest are options
    questionCount++;
    const options: Option[] = rest.map((cell, idx) => parseOptionCell(cell, idx + 1));

    items.push({
      type: "question",
      id: makeId("q", questionCount),
      text_ar: first,
      options,
    });
  }

  // IMPORTANT: show only filename as title
  return {
    id: fileId,
    title_ar: fileId,
    items,
  };
}