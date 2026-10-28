import { useQuestionnairesStore } from "../state/questionnairesContext";
import { QUESTIONNAIRE_REGIONS } from "../questionnaires/regions";
import { NECK_FORM_ID, makeNeckForm } from "../questionnaires/neck";

export function QuestionnairePicker() {
  const { all, selectedId, select, loading, loadError, storageError, retry } = useQuestionnairesStore();
  const groups = QUESTIONNAIRE_REGIONS.map((region) => ({
    ...region,
    entries: region.questionnaires.flatMap((id) => all.filter(({ q }) => q.id === id)),
  }));
  const knownIds = new Set(QUESTIONNAIRE_REGIONS.flatMap((region) => region.questionnaires));
  const otherEntries = all.filter(({ q }) => !knownIds.has(q.id));
  if (otherEntries.length) {
    groups.push({
      id: "other", label_ar: "استبيانات أخرى", label_en: "Other questionnaires",
      questionnaires: [], entries: otherEntries,
    });
  }

  return (
    <>
    {loading ? <p role="status">جارٍ تحميل الاستبيانات…</p> : null}
    {loadError ? <div role="alert">{loadError} <button type="button" className="btn" onClick={retry}>إعادة المحاولة</button></div> : null}
    {storageError ? <p role="status">تعذر حفظ الاستبيانات المستوردة في هذا المتصفح. ستبقى متاحة خلال هذه الجلسة.</p> : null}
    <nav className="questionnaire-regions" aria-label="الاستبيانات حسب المنطقة">
      {groups.filter((group) => group.entries.length > 0).map((group) => (
        <section key={group.id} className="questionnaire-region" aria-labelledby={`region-${group.id}`}>
          <h2 id={`region-${group.id}`} className="region-heading">
            <span>{group.label_ar}</span>
            <span className="region-english" lang="en" dir="ltr">{group.label_en}</span>
          </h2>
          <div className="region-questionnaires">
            {group.id === "neck" && makeNeckForm(all.map(({ q }) => q)) ? (
              <button
                type="button" className="region-questionnaire neck-complete-form"
                aria-pressed={selectedId === NECK_FORM_ID}
                onClick={() => select(NECK_FORM_ID)}
              >
                استبيانات الرقبة — النموذج الكامل
              </button>
            ) : null}
            {group.entries.map(({ q, source }) => (
              <button
                type="button"
                key={`${source}:${q.id}`}
                onClick={() => select(q.id)}
                className="region-questionnaire"
                aria-pressed={selectedId === q.id}
                dir="ltr"
              >
                {q.id}
              </button>
            ))}
          </div>
        </section>
      ))}
    </nav>
    </>
  );
}
