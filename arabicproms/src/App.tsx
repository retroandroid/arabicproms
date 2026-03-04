import { useEffect, useMemo, useState } from "react";
import type { Answer, Questionnaire } from "./types";
import { QUESTIONNAIRES as DEFAULT_QUESTIONNAIRES } from "../input/questionnaires";
import { clearProgress, loadProgress, saveProgress } from "./storage";
import { exportCSV, exportJSON } from "./exporters";
import {
  loadImportedQuestionnaires,
  saveImportedQuestionnaires,
  clearImportedQuestionnaires,
} from "./utils/questionnaireStore";
import { parseDocxToQuestionnairesFromArrayBuffer } from "./utils/docxImport";

type Screen = "select" | "take" | "done";

type AppState = {
  screen: Screen;
  qid: string | null;
  index: number;
  answers: Record<string, Answer>;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function App() {
  // ---- Questionnaires source control ----
  const importedAtBoot = loadImportedQuestionnaires();

  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>(
    () => importedAtBoot ?? DEFAULT_QUESTIONNAIRES
  );
  const [source, setSource] = useState<"imported" | "default">(
    () => (importedAtBoot ? "imported" : "default")
  );

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---- App flow state ----
  const [state, setState] = useState<AppState>({
    screen: "select",
    qid: null,
    index: 0,
    answers: {},
  });

  // Auto-load from public/questionnaires.docx ONLY if we don't already have imported data
  useEffect(() => {
    if (source === "imported") return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingDoc(true);
        setLoadError(null);

        // Put your doc here: public/questionnaires.docx
        const res = await fetch("/questionnaires.docx", { cache: "no-store" });
        if (!res.ok) {
          // If file isn't present, just keep defaults silently (not a hard crash).
          return;
        }

        const buf = await res.arrayBuffer();
        const parsed = await parseDocxToQuestionnairesFromArrayBuffer(buf);

        if (!parsed.length) {
          throw new Error("Parsed 0 sections from the docx. Check section titles/format.");
        }

        if (cancelled) return;

        saveImportedQuestionnaires(parsed);
        setQuestionnaires(parsed);
        setSource("imported");
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setLoadError(msg);
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source]);

  const currentQ = useMemo<Questionnaire | null>(() => {
    if (!state.qid) return null;
    return questionnaires.find((q) => q.id === state.qid) ?? null;
  }, [state.qid, questionnaires]);

  function goHome() {
    setState({ screen: "select", qid: null, index: 0, answers: {} });
  }

  function start(qid: string, resumeIfPossible: boolean) {
    const q = questionnaires.find((x) => x.id === qid);
    if (!q) return;

    if (resumeIfPossible) {
      const progress = loadProgress(qid);
      if (progress) {
        setState({
          screen: "take",
          qid,
          index: clamp(progress.index ?? 0, 0, Math.max(0, q.questions.length - 1)),
          answers: progress.answers ?? {},
        });
        return;
      }
    }

    setState({ screen: "take", qid, index: 0, answers: {} });
  }

  function persist(nextIndex?: number, nextAnswers?: Record<string, Answer>) {
    if (!state.qid) return;
    saveProgress({
      qid: state.qid,
      index: nextIndex ?? state.index,
      answers: nextAnswers ?? state.answers,
      savedAt: new Date().toISOString(),
    });
  }

  function resetImported() {
    clearImportedQuestionnaires();
    // Restore defaults immediately
    setQuestionnaires(DEFAULT_QUESTIONNAIRES);
    setSource("default");
    setLoadError(null);
    // optional: also go home
    goHome();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">✓</div>
          <div>
            <div className="brandTitle">منصة الاستبيانات</div>
            <div className="brandSub">اختر الاستبيان ثم أجب على الأسئلة</div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={goHome} type="button">
            الرئيسية
          </button>

          <button className="btn danger" onClick={resetImported} type="button" title="يمسح الاستبيانات المستوردة">
            إعادة ضبط
          </button>
        </div>
      </header>

      <main className="root">
        {(loadingDoc || loadError) && (
          <section className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="pill">
                  المصدر: <b>{source === "imported" ? "Word (محفوظ)" : "الافتراضي"}</b>
                </div>
                {loadingDoc && <div className="small" style={{ marginTop: 6 }}>جارٍ تحميل questionnaires.docx...</div>}
                {loadError && <div className="small" style={{ marginTop: 6 }}>خطأ: {loadError}</div>}
              </div>

              <div className="small">
                {source !== "imported" && (
                  <>ضع الملف في <b>public/questionnaires.docx</b> ليتم الاستيراد تلقائيًا.</>
                )}
              </div>
            </div>
          </section>
        )}

        {state.screen === "select" && (
          <SelectScreen
            questionnaires={questionnaires}
            onStart={(qid) => {
              const progress = loadProgress(qid);
              if (progress) {
                const wantResume = window.confirm(
                  "يوجد تقدم محفوظ لهذا الاستبيان. هل تريد المتابعة من حيث توقفت؟"
                );
                start(qid, wantResume);
              } else {
                start(qid, false);
              }
            }}
          />
        )}

        {state.screen === "take" && currentQ && (
          <TakeScreen
            q={currentQ}
            index={state.index}
            answers={state.answers}
            onSelectAnswer={(questionId, a) => {
              const nextAnswers = { ...state.answers, [questionId]: a };
              setState((s) => ({ ...s, answers: nextAnswers }));
              persist(state.index, nextAnswers);
            }}
            onPrev={() => setState((s) => ({ ...s, index: Math.max(0, s.index - 1) }))}
            onNext={() => {
              if (!currentQ) return;
              if (state.index >= currentQ.questions.length - 1) {
                persist();
                setState((s) => ({ ...s, screen: "done" }));
              } else {
                const nextIndex = Math.min(currentQ.questions.length - 1, state.index + 1);
                setState((s) => ({ ...s, index: nextIndex }));
                persist(nextIndex);
              }
            }}
            onSave={() => {
              persist();
              alert("تم حفظ التقدم على هذا الجهاز.");
            }}
            onReset={() => {
              if (!state.qid) return;
              const ok = window.confirm("هل تريد مسح التقدم والإجابات لهذا الاستبيان؟");
              if (!ok) return;
              clearProgress(state.qid);
              setState((s) => ({ ...s, index: 0, answers: {} }));
            }}
          />
        )}

        {state.screen === "done" && currentQ && (
          <DoneScreen
            q={currentQ}
            answers={state.answers}
            onExportJSON={() => exportJSON(currentQ, state.answers)}
            onExportCSV={() => exportCSV(currentQ, state.answers)}
            onClearSaved={() => {
              const ok = window.confirm("هل تريد مسح التقدم المحفوظ لهذا الاستبيان؟");
              if (!ok) return;
              clearProgress(currentQ.id);
              alert("تم المسح.");
            }}
            onBack={goHome}
          />
        )}
      </main>

      <footer className="footer">© الاستبيانات — حفظ محلي (يمكن ربطه بقاعدة بيانات لاحقًا)</footer>
    </div>
  );
}

function SelectScreen({
  questionnaires,
  onStart,
}: {
  questionnaires: Questionnaire[];
  onStart: (qid: string) => void;
}) {
  const [term, setTerm] = useState("");

  const list = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return questionnaires;
    return questionnaires.filter(
      (q) =>
        q.id.toLowerCase().includes(t) ||
        q.name.toLowerCase().includes(t) ||
        q.title_ar.toLowerCase().includes(t)
    );
  }, [term, questionnaires]);

  return (
    <section className="card">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>اختر الاستبيان</h2>
          <div className="small">ملاحظة: يتم حفظ التقدم على هذا الجهاز فقط (LocalStorage).</div>
        </div>

        <div style={{ minWidth: 260, maxWidth: 380, width: "100%" }}>
          <input
            className="input"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ابحث عن استبيان (مثل: HOOS أو KOOS ...)"
          />
        </div>
      </div>

      <div className="hr" />

      <div className="grid">
        {list.map((q) => (
          <div
            key={q.id}
            className="qCard"
            role="button"
            tabIndex={0}
            onClick={() => onStart(q.id)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onStart(q.id)}
          >
            <div className="qName">{q.title_ar || q.name || q.id}</div>
            <div className="qMeta">
              <div>عدد الأسئلة: {q.questions.length}</div>
              <div className="small">{q.instructions_ar ?? ""}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TakeScreen(props: {
  q: Questionnaire;
  index: number;
  answers: Record<string, Answer>;
  onSelectAnswer: (questionId: string, a: Answer) => void;
  onPrev: () => void;
  onNext: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const { q, index, answers } = props;

  const total = q.questions.length;
  const i = clamp(index, 0, Math.max(0, total - 1));
  const item = q.questions[i];
  const selected = answers[item.id]?.value;

  const answeredCount = q.questions.reduce((acc, qu) => acc + (answers[qu.id] ? 1 : 0), 0);
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  const opts = item.options ?? q.default_options;

  return (
    <section className="card">
      <div className="row">
        <div>
          <span className="pill">
            الاستبيان: <b>{q.title_ar || q.name || q.id}</b>
          </span>
          <div className="small" style={{ marginTop: 6 }}>
            {q.instructions_ar ?? ""}
          </div>
        </div>
        <span className="pill">
          تمت الإجابة: <b>{answeredCount}</b> / {total}
        </span>
      </div>

      <div className="progressWrap" aria-label="شريط التقدم">
        <div className="progressBar" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="hr" />

      <div className="questionTitle">
        سؤال {i + 1} من {total}
      </div>
      <p className="questionText">{item.text_ar}</p>

      <div className="options">
        {opts.map((opt) => {
          const checked = String(opt.value) === String(selected);
          return (
            <label key={String(opt.value)} className="option">
              <input
                type="radio"
                name="opt"
                value={String(opt.value)}
                checked={checked}
                onChange={() =>
                  props.onSelectAnswer(item.id, { value: opt.value, label_ar: opt.label_ar })
                }
              />
              <span>{opt.label_ar}</span>
            </label>
          );
        })}
      </div>

      <div className="hr" />

      <div className="row">
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <button className="btn" type="button" onClick={props.onPrev} disabled={i === 0}>
            السابق
          </button>
          <button className="btn primary" type="button" onClick={props.onNext}>
            {i === total - 1 ? "إنهاء" : "التالي"}
          </button>
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn ghost" type="button" onClick={props.onSave} title="يحفظ محليًا">
            حفظ التقدم
          </button>
          <button className="btn danger" type="button" onClick={props.onReset}>
            مسح التقدم
          </button>
        </div>
      </div>

      <div className="small" style={{ marginTop: 10 }}>
        يتم الحفظ محليًا على هذا الجهاز. يمكنك لاحقًا ربطه بخادم/قاعدة بيانات إذا تريد.
      </div>
    </section>
  );
}

function DoneScreen(props: {
  q: Questionnaire;
  answers: Record<string, Answer>;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onClearSaved: () => void;
  onBack: () => void;
}) {
  const { q, answers } = props;
  const answeredCount = q.questions.reduce((acc, qu) => acc + (answers[qu.id] ? 1 : 0), 0);

  return (
    <section className="card">
      <div className="row">
        <div>
          <h2 style={{ margin: "0 0 6px 0" }}>تم إنهاء الاستبيان</h2>
          <div className="small">
            الاستبيان: <b>{q.title_ar || q.name || q.id}</b>
          </div>
          <div className="small">
            عدد الإجابات: <b>{answeredCount}</b> / {q.questions.length}
          </div>
        </div>

        <div className="row">
          <button className="btn primary" type="button" onClick={props.onExportJSON}>
            تحميل النتائج JSON
          </button>
          <button className="btn" type="button" onClick={props.onExportCSV}>
            تحميل النتائج CSV
          </button>
          <button className="btn ghost" type="button" onClick={() => window.print()}>
            طباعة
          </button>
        </div>
      </div>

      <div className="hr" />

      <table className="table" aria-label="جدول النتائج">
        <thead>
          <tr>
            <th style={{ width: 70 }}>#</th>
            <th>السؤال</th>
            <th style={{ width: 120 }}>القيمة</th>
            <th style={{ width: 220 }}>الإجابة</th>
          </tr>
        </thead>
        <tbody>
          {q.questions.map((qu, idx) => {
            const a = answers[qu.id];
            return (
              <tr key={qu.id}>
                <td>{idx + 1}</td>
                <td>{qu.text_ar}</td>
                <td>{a ? String(a.value) : ""}</td>
                <td>{a ? a.label_ar : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="hr" />

      <div className="row">
        <button className="btn danger" type="button" onClick={props.onClearSaved}>
          مسح التقدم المحفوظ
        </button>
        <button className="btn" type="button" onClick={props.onBack}>
          رجوع لاختيار استبيان
        </button>
      </div>
    </section>
  );
}