import Papa from "papaparse";
import type { Questionnaire, Item, Option, OptionValue } from "./types";

function makeId(prefix: string, n: number) {
  return `${prefix}_${n}`;
}

function parseOptionValue(rawValue: string): OptionValue {
  return /^\d+$/.test(rawValue) ? Number(rawValue) : rawValue;
}

function parseOptionCell(cell: string, fallbackValue: number): Option {
  const s = (cell ?? "").trim();

  // Accepts numeric and string-coded options such as "1- لا شيء" or "X- غير متاح".
  const m = s.match(/^([A-Za-z0-9]+)\s*[-–—]\s*(.+)$/);
  if (m) return { value: parseOptionValue(m[1]), label_ar: m[2].trim() };

  // Bare numeric cells such as "9" or "0" should score as the displayed value.
  if (/^\d+$/.test(s)) return { value: Number(s), label_ar: s };

  // If no numeric prefix, use position-based value
  return { value: fallbackValue, label_ar: s };
}

export function parseZurichCsvText(csvText: string, fileId: string): Questionnaire {
  const parsed = Papa.parse<string[]>(csvText, {
    delimiter: ",",
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0]?.message || "CSV parse error");
  }

  const rows = (parsed.data || []) as string[][];

  const items: Item[] = [];
  let sectionCount = 0;
  let questionCount = 0;
  let title = fileId;

  for (const row of rows) {
    const cells = (row || []).map((c) => (c ?? "").trim());
    const first = (cells[0] ?? "").trim();
    if (!first) continue;

    // Remaining non-empty cells
    const rest = cells
      .slice(1)
      .map((x) => (x ?? "").trim())
      .filter((x) => x !== "");

    // Ignore meta rows after reading the display title when present.
    if (first.startsWith("@")) {
      if (first.toLowerCase() === "@title" && rest.length > 0) {
        title = rest.join(", ").trim();
      }
      continue;
    }

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

  return {
    id: fileId,
    title_ar: title,
    items,
  };
}
