import React, { useState } from "react";
import { parseZurichCsvText } from "../core/csvZurich";
import { useQuestionnairesStore } from "../state/questionnairesStore";

export function CsvImportPanel() {
  const { addFromUser } = useQuestionnairesStore();
  const [err, setErr] = useState<string | null>(null);

  async function onPick(file: File | null) {
    setErr(null);
    if (!file) return;

    try {
      const text = await file.text();
      const id = file.name.replace(/\.csv$/i, "");
      const q = parseZurichCsvText(text, id);
      addFromUser([q]);
    } catch (e: any) {
      setErr(e?.message || "فشل استيراد الملف");
    }
  }

  return (
    <div style={styles.box}>
      <div style={styles.title}>إضافة استبيان من CSV (من المتصفح)</div>
      <input type="file" accept=".csv,text/csv" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      {err && <div style={styles.err}>{err}</div>}
      <div style={styles.hint}>
        سيتم حفظه على هذا المتصفح (LocalStorage).
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
  },
  title: { fontSize: 14, marginBottom: 8 },
  err: { marginTop: 8, color: "#ffb4b4" },
  hint: { marginTop: 8, fontSize: 12, opacity: 0.75 },
};