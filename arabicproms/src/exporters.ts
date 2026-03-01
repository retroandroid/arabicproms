import type { Questionnaire, Answer } from "./types";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportJSON(q: Questionnaire, answers: Record<string, Answer>) {
  const payload = {
    questionnaire_id: q.id,
    questionnaire_name: q.name,
    finishedAt: new Date().toISOString(),
    answers,
  };
  downloadFile(`${q.id}_results.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function exportCSV(q: Questionnaire, answers: Record<string, Answer>) {
  const header = ["question_id", "question_text_ar", "value", "label_ar"];
  const rows: string[][] = [header];

  for (const qu of q.questions) {
    const a = answers[qu.id];
    rows.push([
      qu.id,
      qu.text_ar ?? "",
      a ? String(a.value) : "",
      a ? (a.label_ar ?? "") : "",
    ]);
  }

  const csv = rows
    .map(cols => cols.map(x => `"${String(x).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  downloadFile(`${q.id}_results.csv`, csv, "text/csv;charset=utf-8");
}