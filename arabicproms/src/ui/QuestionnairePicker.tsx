import { useQuestionnairesStore } from "../state/questionnairesStore";
import { QUESTIONNAIRE_REGIONS } from "../questionnaires/regions";

export function QuestionnairePicker() {
  const { all, selectedId, select } = useQuestionnairesStore();
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
    <nav className="questionnaire-regions" aria-label="الاستبيانات حسب المنطقة">
      {groups.filter((group) => group.entries.length > 0).map((group) => (
        <section key={group.id} className="questionnaire-region" aria-labelledby={`region-${group.id}`}>
          <h2 id={`region-${group.id}`} className="region-heading">
            <span>{group.label_ar}</span>
            <span className="region-english" lang="en" dir="ltr">{group.label_en}</span>
          </h2>
          <div className="region-questionnaires">
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
  );
}
