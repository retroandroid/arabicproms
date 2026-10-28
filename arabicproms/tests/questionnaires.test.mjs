import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const EXPECTED_COUNTS = {
  AOS: 18, BFS: 16, "Bournemouth Neck": 7, CPGS: 7, DHI: 18, Edinburgh: 6,
  FAAM: 28, FAOS: 41, "HOOS-12": 12, "HOOS-JR": 6, "HOOS-PS": 5,
  HOOS: 41, "iHOT-12": 13, "iHOT-33": 34, "KOOS-12": 12,
  "KOOS-JR": 7, LLTQ: 40, MHQ: 62, PSS: 24, QBS: 20,
  "SFI-10": 11, SFI: 26, Zurich: 18,
};
const root = fileURLToPath(new URL("..", import.meta.url));
let server;
let questionnaires;
let scoreQuestionnaire;
let regions;
let testStore;
let QuestionnaireRunner;
let QuestionnairePicker;
let parseZurichCsvText;
let makeNeckForm;

before(async () => {
  server = await createServer({
    configFile: false, root,
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: "questionnaire-store-fixture", enforce: "pre",
      load(id) {
        if (id.endsWith("/src/state/questionnairesContext.ts")) {
          return `export const testStore = { all: [], selectedId: null, select(id) { this.selectedId = id; } };
            export function useQuestionnairesStore() { return testStore; }`;
        }
      },
    }],
  });
  ({ parseZurichCsvText } = await server.ssrLoadModule("/src/core/csvZurich.ts"));
  ({ scoreQuestionnaire } = await server.ssrLoadModule("/src/core/scoring.ts"));
  ({ QUESTIONNAIRE_REGIONS: regions } = await server.ssrLoadModule("/src/questionnaires/regions.ts"));
  ({ makeNeckForm } = await server.ssrLoadModule("/src/questionnaires/neck.ts"));
  ({ testStore } = await server.ssrLoadModule("/src/state/questionnairesContext.ts"));
  ({ QuestionnaireRunner } = await server.ssrLoadModule("/src/ui/QuestionnaireRunner.tsx"));
  ({ QuestionnairePicker } = await server.ssrLoadModule("/src/ui/QuestionnairePicker.tsx"));
  const manifest = JSON.parse(await readFile(new URL("../public/questionnaires/manifest.json", import.meta.url), "utf8"));
  questionnaires = await Promise.all(manifest.files.map(async (file) => parseZurichCsvText(
    await readFile(new URL(`../public/questionnaires/${file}`, import.meta.url), "utf8"), file.slice(0, -4),
  )));
  testStore.all = questionnaires.map((q) => ({ q, source: "builtin" }));
});
after(() => server?.close());

function questionsOf(q) { return q.items.filter((item) => item.type === "question"); }
function byId(id) { return id === "Neck Forms" ? makeNeckForm(questionnaires) : questionnaires.find((q) => q.id === id); }
function numericAnswers(q, maximum = false) {
  return Object.fromEntries(questionsOf(q).map((question) => {
    if (question.input) return [question.id, maximum ? 180 : question.input.min];
    const numbers = question.options.filter((option) => typeof option.value === "number");
    const selected = numbers.length
      ? numbers.reduce((a, b) => (maximum ? a.value > b.value : a.value < b.value) ? a : b)
      : question.options[0];
    return [question.id, selected.value];
  }));
}
function metrics(q, answers) {
  const result = scoreQuestionnaire(q, answers);
  assert.equal(result.status, "ready", `${q.id}: ${result.note_ar}`);
  return Object.fromEntries(result.metrics.map((metric) => [metric.key, metric.value]));
}
function normalizedArabic(text) { return text.normalize("NFKC").replace(/\s+/g, ""); }

test("manifest includes every CSV once and every questionnaire belongs to one region", async () => {
  const files = (await readdir(new URL("../public/questionnaires/", import.meta.url))).filter((file) => file.endsWith(".csv"));
  assert.deepEqual(questionnaires.map((q) => `${q.id}.csv`).sort(), files.sort());
  assert.equal(new Set(questionnaires.map((q) => q.id)).size, Object.keys(EXPECTED_COUNTS).length);
  assert.deepEqual(regions.flatMap((region) => region.questionnaires).sort(), questionnaires.map((q) => q.id).sort());
});

for (const [id, count] of Object.entries(EXPECTED_COUNTS)) {
  test(`${id}: content parses with unique question IDs and answer values`, () => {
    const q = byId(id);
    const questions = questionsOf(q);
    assert.equal(questions.length, count);
    assert.ok(q.title_ar.trim());
    assert.equal(new Set(q.items.map((item) => item.id)).size, q.items.length);
    for (const question of questions) {
      assert.ok(question.text_ar.trim());
      if (question.input) {
        assert.equal(question.input.type, "number");
        assert.equal(question.options.length, 0);
      } else assert.ok(question.options.length >= 2);
      assert.equal(new Set(question.options.map((option) => option.value)).size, question.options.length, question.id);
      assert.ok(question.options.every((option) => option.label_ar.trim()));
    }
  });
  test(`${id}: real form renders all questions, answer controls and the selected region button`, () => {
    testStore.selectedId = id;
    const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
    assert.equal((html.match(/class="question-legend"/g) ?? []).length, count);
    assert.equal((html.match(/type="radio"/g) ?? []).length,
      questionsOf(byId(id)).reduce((sum, question) => sum + question.options.length, 0) + (id === "PSS" ? 7 : id === "Zurich" ? 3 : 0));
    for (const question of questionsOf(byId(id))) assert.ok(html.includes(`name="${id}-${question.id}"`));
    const picker = renderToStaticMarkup(React.createElement(QuestionnairePicker));
    assert.equal((picker.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.equal((picker.match(/class="region-questionnaire"/g) ?? []).length, Object.keys(EXPECTED_COUNTS).length);
  });
  test(`${id}: blank submission is incomplete and both numeric endpoints produce finite results`, () => {
    const q = byId(id);
    assert.equal(scoreQuestionnaire(q, {}).status, "incomplete");
    for (const maximum of [false, true]) {
      const result = scoreQuestionnaire(q, numericAnswers(q, maximum));
      if (id === "CPGS") {
        assert.equal(result.status, "unsupported");
        assert.match(result.note_ar, /لا يتضمن قواعد احتساب/);
        continue;
      }
      assert.equal(result.status, "ready");
      assert.ok(result.metrics.length > 0);
      for (const metric of result.metrics) assert.ok(Number.isFinite(metric.value), `${id}/${metric.key}`);
    }
  });
  test(`${id}: removing a required scored response prevents calculation`, () => {
    const q = byId(id);
    const questions = questionsOf(q);
    const answers = numericAnswers(q);
    if (id === "iHOT-33") delete answers[questions.find((question) => question.text_ar === "حالة العمل").id];
    const scoredQuestions = questions.filter((question, index) => {
      if (["HOOS", "iHOT-12", "BFS", "SFI"].includes(id) && index === 0) return false;
      if (id === "iHOT-33" && question.text_ar === "حالة العمل") return false;
      if (id === "LLTQ" && !question.text_ar.includes("القدرة")) return false;
      return true;
    });
    for (const question of scoredQuestions) {
      const incomplete = { ...answers };
      delete incomplete[question.id];
      assert.equal(scoreQuestionnaire(q, incomplete).status, "incomplete", `${id}: ${question.id} is not required for scoring`);
    }
  });
  test(`${id}: 100 deterministic valid-response submissions stay in the displayed score ranges`, () => {
    const q = byId(id);
    let seed = 5726;
    for (let run = 0; run < 100; run++) {
      const answers = Object.fromEntries(questionsOf(q).map((question) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        if (question.input) return [question.id, seed % 181];
        return [question.id, question.options[seed % question.options.length].value];
      }));
      const result = scoreQuestionnaire(q, answers);
      if (id === "CPGS") {
        assert.equal(result.status, "unsupported");
        assert.equal(result.metrics, undefined);
        assert.match(result.note_ar, /لا يتضمن قواعد احتساب/);
        continue;
      }
      assert.equal(result.status, "ready", `${id}, submission ${run}: ${result.note_ar}`);
      for (const metric of result.metrics) {
        assert.ok(Number.isFinite(metric.value));
        // Raw sums and denominators are not percentages (iHOT-12 raw max is 120).
        if (["raw_score", "adjusted_denominator"].includes(metric.key)) continue;
        assert.ok(metric.value >= 0 && metric.value <= 100, `${id}/${metric.key} = ${metric.value} (submission ${run})`);
      }
    }
  });
}

test("HOOS: all 40 question texts and five option values match the supplied workbook", async () => {
  const source = JSON.parse(await readFile(new URL("./fixtures/hoos-source.json", import.meta.url), "utf8"));
  const actual = questionsOf(byId("HOOS")).slice(1);
  assert.equal(actual.length, source.length);
  actual.forEach((question, index) => {
    assert.equal(normalizedArabic(question.text_ar), normalizedArabic(source[index][0]));
    assert.deepEqual(question.options.map((option) => option.value), [0, 1, 2, 3, 4]);
    question.options.forEach((option, i) => assert.equal(normalizedArabic(option.label_ar), normalizedArabic(source[index][i + 1].replace(/\(\d\+\)/, ""))));
  });
});

test("HOOS: independent domain calculations use workbook denominators 20, 40, 68, 16, 16", () => {
  const q = byId("HOOS");
  const questions = questionsOf(q);
  const answers = Object.fromEntries(questions.map((question, index) => [question.id, index === 0 ? "R" : index % 5]));
  const result = metrics(q, answers);
  const blocks = [["symptoms", 1, 6, 20], ["pain", 6, 16, 40], ["adl_function", 16, 33, 68], ["sport_recreation", 33, 37, 16], ["quality_of_life", 37, 41, 16]];
  for (const [key, start, end, denominator] of blocks) {
    const expected = questions.slice(start, end).reduce((sum, question) => sum + answers[question.id], 0) / denominator * 100;
    assert.equal(result[key], expected);
  }
  const left = { ...answers, [questions[0].id]: "L" };
  assert.deepEqual(metrics(q, left), result);
});

test("Bournemouth: endpoint descriptions match each PDF question's meaning", () => {
  const expected = [
    ["لا ألم", "أسوأ ألم ممكن"],
    ["لا تدخل", "لا يمكن القيام بالنشاط"],
    ["لا تدخل", "لا يمكن القيام بالنشاط"],
    ["لا أشعر بالقلق على الإطلاق", "قلق شديد"],
    ["لا أشعر بالاكتئاب على الإطلاق", "اكتئاب شديد"],
    ["لم تزد الأمور سوءًا", "زادت الأمور سوءًا كثيرًا"],
    ["أتحكم فيها بالكامل", "لا أتحكم فيها على الإطلاق"],
  ];
  questionsOf(byId("Bournemouth Neck")).forEach((question, index) => {
    assert.equal(question.options.find((option) => option.value === 0).label_ar, expected[index][0], `question ${index + 1}, zero label`);
    assert.equal(question.options.find((option) => option.value === 10).label_ar, expected[index][1], `question ${index + 1}, ten label`);
  });
});

test("Zurich: walking-distance choices use the PDF's metric distances", () => {
  const question = questionsOf(byId("Zurich"))[7];
  assert.deepEqual(question.options.map((option) => option.label_ar), [
    "أكثر من 3 كم", "أكثر من 200 م، لكن أقل من 3 كم", "أكثر من 15 م، لكن أقل من 200 م", "أقل من 15 م",
  ]);
});

test("Zurich: balance, walking to the bathroom and final satisfaction answers affect their domains", () => {
  const q = byId("Zurich");
  const questions = questionsOf(q);
  const answers = numericAnswers(q);
  const baseline = metrics(q, answers);
  for (const [index, domain] of [[6, "symptom_severity"], [11, "physical_function"], [17, "patient_satisfaction"]]) {
    const changed = { ...answers, [questions[index].id]: Math.max(...questions[index].options.map((option) => option.value)) };
    assert.notEqual(metrics(q, changed)[domain], baseline[domain], `${questions[index].text_ar} is silently excluded`);
  }
});

test("iHOT-33: best responses are 100/100 both with and without the work-section skip", () => {
  const q = byId("iHOT-33");
  const questions = questionsOf(q);
  const answers = numericAnswers(q, true);
  const statusQuestion = questions.find((question) => question.text_ar === "حالة العمل");
  const noSkip = { ...answers };
  delete noSkip[statusQuestion.id];
  assert.equal(metrics(q, noSkip).total_score, 100);
  const skip = { ...answers, [statusQuestion.id]: "K" };
  assert.equal(metrics(q, skip).total_score, 100);
});

test("FAAM: wholly non-applicable answers must not be reported as a zero-percent function score", () => {
  const q = byId("FAAM");
  const answers = Object.fromEntries(questionsOf(q).map((question) => [question.id, "X"]));
  assert.notEqual(scoreQuestionnaire(q, answers).status, "ready");
});

test("neck PDF: the seven-item Chronic Pain Grade Scale is present", () => {
  assert.equal(questionsOf(byId("CPGS")).length, 7);
  assert.ok(regions.find((region) => region.id === "neck").questionnaires.includes("CPGS"));
});

test("CPGS: all seven source prompts, scales and open day count are present", () => {
  const expected = [
    "كيف ستقيّم ألمك على مقياس من 0 إلى 10 في الوقت الحالي (الآن)؟",
    "في الأشهر الستة الماضية، كيف كانت شدة أسوأ ألم لديك على مقياس من 0 إلى 10؟",
    "في الأشهر الستة الماضية، في المعدّل، كيف كانت شدة ألمك على مقياس من 0 إلى 10؟",
    "كم عدد الأيام تقريبًا في الأشهر الستة الماضية تم منعك فيها من القيام بأنشطتك المعتادة (العمل، المدرسة، الأعمال المنزلية) بسبب هذا الألم؟",
    "في الأشهر الستة الماضية، إلى أي مدى أثّر هذا الألم على أنشطتك اليومية؟",
    "في الأشهر الستة الماضية، إلى أي مدى أثّر هذا الألم على قدرتك على المشاركة في الأنشطة الترفيهية والاجتماعية والعائلية؟",
    "في الأشهر الستة الماضية، كيف أثّر هذا الألم على قدرتك على العمل (بما في ذلك الأعمال المنزلية)؟",
  ];
  const questions = questionsOf(byId("CPGS"));
  assert.deepEqual(questions.map((question) => question.text_ar.replace(/^\d+\.\s*/, "")), expected);
  for (const [index, question] of questions.entries()) {
    if (index === 3) {
      assert.deepEqual(question.input, { type: "number", min: 0, step: 1 });
      assert.deepEqual(question.options, []);
    } else assert.deepEqual(question.options.map((option) => option.value), Array.from({ length: 11 }, (_, i) => i));
  }
});

test("CPGS: zero days is answered, blank is incomplete, and invalid day counts are rejected", () => {
  const q = byId("CPGS");
  const dayId = questionsOf(q)[3].id;
  const answers = numericAnswers(q);
  assert.equal(answers[dayId], 0);
  assert.match(scoreQuestionnaire(q, answers).note_ar, /تم إكمال/);
  delete answers[dayId];
  assert.equal(scoreQuestionnaire(q, answers).status, "incomplete");
  for (const value of [-1, 1.5, "days", NaN, Infinity]) {
    const result = scoreQuestionnaire(q, { ...answers, [dayId]: value });
    assert.equal(result.status, "unsupported");
    assert.match(result.note_ar, /عدد الأيام/);
  }
});

test("CPGS: the form renders a required number input and completion without a clinical grade", () => {
  testStore.selectedId = "CPGS";
  const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
  const dayInput = html.match(/<input[^>]*type="number"[^>]*>/)?.[0];
  assert.ok(dayInput);
  for (const attribute of ['name="CPGS-q_4"', 'min="0"', 'step="1"', 'required=""']) {
    assert.ok(dayInput.includes(attribute), `Missing numeric input attribute: ${attribute}`);
  }
  assert.equal((html.match(/type="radio"/g) ?? []).length, 66);
  assert.ok(html.includes("إتمام الاستبيان"));
  assert.ok(html.includes("Chronic Pain Grade Scale"));
  assert.ok(html.includes("0 / 11"));
});

test("numeric CSV questions retain their position without becoming sections or choices", () => {
  const q = parseZurichCsvText("@title,Example\nFirst,0- None,1- Some\n@number,Days,0,1\nLast,0- None,1- Some", "example");
  assert.deepEqual(questionsOf(q).map((question) => question.id), ["q_1", "q_2", "q_3"]);
  assert.equal(questionsOf(q)[1].text_ar, "Days");
  for (const text of ["@number,,0,1", "@number,Days,NaN,1", "@number,Days,0,0"]) {
    assert.throws(() => parseZurichCsvText(text, "invalid"), /Invalid @number/);
  }
});

test("source demographics are separate from scored items and use accessible unique labels", async () => {
  const { SOURCE_PATIENT_FIELDS } = await server.ssrLoadModule("/src/questionnaires/patientFields.ts");
  for (const [id, fields] of Object.entries(SOURCE_PATIENT_FIELDS)) {
    testStore.selectedId = id;
    const q = byId(id);
    const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
    assert.equal(questionsOf(q).length, id === "Neck Forms" ? 14 : EXPECTED_COUNTS[id]);
    const prefix = id.replace(/[^a-zA-Z0-9_-]/g, "-");
    for (const field of fields) {
      const inputId = `${prefix}-patient-${field.id}`;
      const inputIds = field.type === "radio" ? field.options.map((_, index) => `${inputId}-${index}`) : [inputId];
      for (const controlId of inputIds) {
        assert.ok(html.includes(`for="${controlId}"`));
        assert.ok(html.includes(`id="${controlId}"`));
      }
    }
    const answers = numericAnswers(q);
    assert.deepEqual(scoreQuestionnaire(q, { ...answers, ...Object.fromEntries(fields.map((field) => [`${prefix}-patient-${field.id}`, "test"])) }), scoreQuestionnaire(q, answers));
  }
});

for (const id of ["HOOS", "Bournemouth Neck", "CPGS", "Zurich", "Edinburgh"]) {
  test(`${id}: source patient-information fields have entry controls`, () => {
    testStore.selectedId = id;
    const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
    const labels = id === "HOOS" ? ["اسم المريض", "رقم الملف الطبي للمريض", "التاريخ"] : ["اسم المريض", "تاريخ الولادة", "الجنس", "رقم الهاتف"];
    for (const label of labels) assert.ok(html.includes(label), `Missing source field: ${label}`);
    assert.ok(/type="(?:text|date|tel)"/.test(html), "No patient text/date/phone entry control");
  });
}

test("complete neck form matches all 14 PDF prompts, numbering and response anchors", async () => {
  const source = JSON.parse(await readFile(new URL("./fixtures/neck-source.json", import.meta.url), "utf8"));
  const form = byId("Neck Forms");
  const questions = questionsOf(form);
  assert.equal(questions.length, source.questions.length);
  questions.forEach((question, index) => {
    const expected = source.questions[index];
    assert.equal(normalizedArabic(question.text_ar), normalizedArabic(`${expected.number}. ${expected.text_ar}`));
    if (expected.kind === "number") {
      assert.deepEqual(question.input, { type: "number", min: 0, step: 1 });
    } else {
      assert.deepEqual(question.options.map((option) => option.value), Array.from({ length: 11 }, (_, i) => i));
      assert.deepEqual([question.options[0].label_ar, question.options.at(-1).label_ar], expected.endpoints);
    }
  });
});

test("complete neck form renders patient fields once and both PDF sections in order", () => {
  testStore.selectedId = "Neck Forms";
  const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
  assert.ok(html.includes("استبيانات الرقبة"));
  assert.ok(html.includes("0 / 18"));
  assert.equal((html.match(/class="question-legend"/g) ?? []).length, 14);
  assert.equal((html.match(/class="patient-details"/g) ?? []).length, 1);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 143);
  assert.equal((html.match(/type="number"/g) ?? []).length, 1);
  assert.ok(html.indexOf("Bournemouth Neck Questionnaire") < html.indexOf("Chronic Pain Grade Scale (CPGS) Questionnaire"));
  assert.ok(html.includes('name="Neck Forms-BN_q_1"'));
  assert.ok(html.includes('name="Neck Forms-CPGS_q_7"'));
  const picker = renderToStaticMarkup(React.createElement(QuestionnairePicker));
  assert.equal((picker.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.ok(picker.includes("استبيانات الرقبة — النموذج الكامل"));
});

test("neck scales render numbers from 0 to 10 and retain both endpoint descriptions", () => {
  for (const id of ["Bournemouth Neck", "CPGS", "Neck Forms"]) {
    testStore.selectedId = id;
    const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
    const values = [...html.matchAll(/type="radio"[^>]*value="(\d+)"/g)].map((match) => Number(match[1]));
    assert.ok(values.length > 0);
    for (let index = 0; index < values.length; index += 11) {
      assert.deepEqual(values.slice(index, index + 11), Array.from({ length: 11 }, (_, i) => i));
    }
    assert.ok(html.includes('class="neck-scale-anchors"'));
  }
});

test("complete neck form scores only Bournemouth and identifies the ungraded CPGS section", () => {
  const q = byId("Neck Forms");
  const answers = numericAnswers(q);
  for (const question of questionsOf(q).filter((question) => question.id.startsWith("BN_"))) answers[question.id] = 5;
  const baseline = scoreQuestionnaire(q, answers);
  assert.equal(baseline.status, "ready");
  assert.equal(baseline.metrics[0].value, 50);
  assert.equal(baseline.metrics.length, 1);
  assert.match(baseline.note_ar, /لا تدخل في درجة بورنموث/);
  const changed = { ...answers };
  for (const question of questionsOf(q).filter((question) => question.id.startsWith("CPGS_"))) changed[question.id] = question.input ? 180 : 10;
  assert.deepEqual(scoreQuestionnaire(q, changed).metrics, baseline.metrics);
  changed.CPGS_q_4 = -1;
  assert.equal(scoreQuestionnaire(q, changed).status, "unsupported");
});

test("complete neck form requires every source response, including zero days", () => {
  const q = byId("Neck Forms");
  const answers = numericAnswers(q);
  assert.equal(scoreQuestionnaire(q, answers).status, "ready");
  for (const question of questionsOf(q)) {
    const incomplete = { ...answers };
    delete incomplete[question.id];
    const result = scoreQuestionnaire(q, incomplete);
    assert.equal(result.status, "incomplete", question.id);
    assert.equal(result.missingCount, 1);
  }
});

test("neck bundle is unavailable if either source questionnaire is missing or incomplete", () => {
  assert.equal(makeNeckForm(questionnaires.filter((q) => q.id !== "CPGS")), null);
  const incomplete = { ...byId("CPGS"), items: byId("CPGS").items.slice(0, -1) };
  assert.equal(makeNeckForm(questionnaires.map((q) => q.id === "CPGS" ? incomplete : q)), null);
});

test("public questionnaire loader requests fresh files and includes both neck instruments", async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    const data = await readFile(new URL(`../public${decodeURIComponent(url)}`, import.meta.url), "utf8");
    return new Response(data);
  };
  try {
    const { loadBuiltinQuestionnaires } = await server.ssrLoadModule("/src/questionnaires/index.ts");
    const loaded = await loadBuiltinQuestionnaires();
    assert.equal(loaded.length, Object.keys(EXPECTED_COUNTS).length);
    assert.equal(questionsOf(makeNeckForm(loaded)).length, 14);
    assert.ok(requests.every(({ options }) => options.cache === "no-store"));
    assert.ok(requests.some(({ url }) => url.endsWith("Bournemouth%20Neck.csv")));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

for (const id of Object.keys(EXPECTED_COUNTS)) {
  test(`${id}: every selected answer rejects invalid values before scoring`, () => {
    const q = byId(id);
    for (const question of questionsOf(q)) {
      for (const invalid of [NaN, Infinity, -Infinity, undefined, null, {}, "__invalid__", -1000, 0.5]) {
        const result = scoreQuestionnaire(q, { ...numericAnswers(q), [question.id]: invalid });
        assert.equal(result.status, "unsupported", `${question.id}: ${String(invalid)}`);
        assert.equal(result.metrics, undefined);
      }
    }
  });
  test(`${id}: truncated and extended forms cannot silently shift score groups`, () => {
    const q = byId(id);
    const question = questionsOf(q)[0];
    for (const items of [q.items.filter((item) => item.id !== question.id), [...q.items, { ...question, id: "extra" }]]) {
      assert.equal(scoreQuestionnaire({ ...q, items }, numericAnswers(q)).status, "unsupported");
    }
  });
}

test("FAAM: an entirely N/A section is omitted while the assessed section remains calculable", () => {
  const q = byId("FAAM");
  const questions = questionsOf(q);
  for (const [start, end, expectedKey] of [[0, 21, "sports_score"], [21, 28, "adl_score"]]) {
    const answers = numericAnswers(q, true);
    questions.slice(start, end).forEach((question) => { answers[question.id] = "X"; });
    const result = scoreQuestionnaire(q, answers);
    assert.equal(result.status, "ready");
    assert.deepEqual(result.metrics.map((metric) => [metric.key, metric.value]), [[expectedKey, 100]]);
  }
});

test("iHOT-33: each X removes ten possible points and K/L both exclude the four work items", () => {
  const q = byId("iHOT-33");
  const questions = questionsOf(q);
  const status = questions.find((question) => question.text_ar === "حالة العمل");
  const answers = numericAnswers(q, true);
  delete answers[status.id];
  const all = metrics(q, answers);
  assert.equal(all.raw_score, 330);
  assert.equal(all.adjusted_denominator, 330);
  const x = questions.find((question) => question.options.some((option) => option.value === "X"));
  assert.equal(metrics(q, { ...answers, [x.id]: "X" }).adjusted_denominator, 320);
  assert.equal(metrics(q, { ...answers, [x.id]: "X" }).total_score, 100);
  for (const skip of ["K", "L"]) {
    const skipped = { ...answers, [status.id]: skip };
    questions.filter((question) => question.id !== status.id).slice(22, 26).forEach((question) => { delete skipped[question.id]; });
    const result = metrics(q, skipped);
    assert.equal(result.adjusted_denominator, 290);
    assert.equal(result.total_score, 100);
  }
});

test("Zurich: a one-point change in every item affects exactly its own domain", () => {
  const q = byId("Zurich");
  const baselineAnswers = numericAnswers(q);
  const baseline = metrics(q, baselineAnswers);
  questionsOf(q).forEach((question, index) => {
    const next = question.options.map((option) => option.value).sort((a, b) => a - b)[1];
    const domain = index < 7 ? "symptom_severity" : index < 12 ? "physical_function" : "patient_satisfaction";
    const denominator = index < 7 ? 35 : index < 12 ? 20 : 24;
    const changed = metrics(q, { ...baselineAnswers, [question.id]: next });
    for (const key of Object.keys(baseline)) {
      const expected = key === domain ? (next - baselineAnswers[question.id]) / denominator * 100 : 0;
      assert.ok(Math.abs(changed[key] - baseline[key] - expected) < 1e-10, question.id);
    }
  });
  assert.deepEqual(Object.values(metrics(q, numericAnswers(q, true))), [100, 100, 100]);
});

test("JR lookup scores decrease for every possible raw sum, including both endpoints", () => {
  for (const [id, max] of [["HOOS-JR", 24], ["KOOS-JR", 28]]) {
    const q = byId(id);
    let previous = Infinity;
    for (let sum = 0; sum <= max; sum++) {
      let remaining = sum;
      const answers = Object.fromEntries(questionsOf(q).map((question) => {
        const value = Math.min(remaining, 4); remaining -= value;
        return [question.id, value];
      }));
      const result = scoreQuestionnaire(q, answers);
      assert.equal(result.status, "ready");
      const score = result.metrics.find((metric) => metric.key !== "raw_score").value;
      assert.ok(score < previous);
      if (sum === 0) assert.equal(score, 100);
      if (sum === max) assert.equal(score, 0);
      previous = score;
    }
  }
});

test("MHQ: each never-pain branch permits only the corresponding follow-ups to be skipped", () => {
  const q = byId("MHQ");
  const questions = questionsOf(q);
  for (const sides of [[32], [37], [32, 37]]) {
    const answers = numericAnswers(q);
    for (const index of sides) {
      answers[questions[index].id] = 5;
      questions.slice(index + 1, index + 5).forEach((question) => { delete answers[question.id]; });
    }
    assert.equal(scoreQuestionnaire(q, answers).status, "ready");
    const required = questions[sides.length === 2 ? 0 : sides[0] === 32 ? 38 : 33];
    delete answers[required.id];
    assert.equal(scoreQuestionnaire(q, answers).status, "incomplete");
  }
});

test("malformed CSVs and invalid numeric definitions cannot become usable forms", () => {
  for (const csv of ["", "Heading only", "Question,0-No,0-Yes", "Question,Yes", '@number,"Days",0,0', '@number,"Days",0,NaN', 'Question,"Unclosed']) {
    assert.throws(() => parseZurichCsvText(csv, "Invalid"), csv);
  }
});

test("unknown and inherited object-property instrument IDs return unsupported safely", () => {
  for (const id of ["Unknown", "toString", "constructor", "__proto__"]) {
    const q = { ...byId("DHI"), id };
    assert.equal(scoreQuestionnaire(q, numericAnswers(q)).status, "unsupported");
    testStore.all = [{ q, source: "user" }];
    testStore.selectedId = id;
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(QuestionnaireRunner)));
  }
  testStore.all = questionnaires.map((q) => ({ q, source: "builtin" }));
});

test("loader rejects missing CSVs, invalid manifests, malformed CSVs and network errors", async () => {
  const previousFetch = globalThis.fetch;
  const { loadBuiltinQuestionnaires } = await server.ssrLoadModule("/src/questionnaires/index.ts");
  try {
    for (const manifest of [null, {}, { files: [] }, { files: [2] }, { files: ["../x.csv"] }, { files: ["x.csv", "x.csv"] }]) {
      globalThis.fetch = async () => Response.json(manifest);
      await assert.rejects(loadBuiltinQuestionnaires());
    }
    globalThis.fetch = async () => new Response("Missing", { status: 404 });
    await assert.rejects(loadBuiltinQuestionnaires(), /manifest/);
    globalThis.fetch = async (url) => url.endsWith("manifest.json") ? Response.json({ files: ["x.csv"] }) : new Response("Missing", { status: 404 });
    await assert.rejects(loadBuiltinQuestionnaires(), /x.csv/);
    globalThis.fetch = async (url) => url.endsWith("manifest.json") ? Response.json({ files: ["x.csv"] }) : new Response("No questions");
    await assert.rejects(loadBuiltinQuestionnaires(), /Invalid questionnaire/);
    globalThis.fetch = async (url) => url.endsWith("manifest.json") ? Response.json({ files: ["DHI.csv"] }) : new Response("Question,0-No,1-Yes");
    await assert.rejects(loadBuiltinQuestionnaires(), /Incomplete questionnaire/);
    globalThis.fetch = async () => { throw new Error("Offline"); };
    await assert.rejects(loadBuiltinQuestionnaires(), /Offline/);
  } finally { globalThis.fetch = previousFetch; }
});

test("storage ignores damaged entries and duplicate IDs, and tolerates unavailable storage", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = await server.ssrLoadModule("/src/core/Storage.ts");
  try {
    for (const raw of ["invalid JSON", "null", "{}", '[{},null,{"id":"broken"}]']) {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => raw } });
      assert.deepEqual(storage.loadUserQuestionnaires(), []);
    }
    const q = byId("DHI");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
      getItem: () => JSON.stringify([null, q, q]), setItem: () => { throw new Error("Quota exceeded"); },
    } });
    assert.equal(storage.loadUserQuestionnaires().length, 1);
    assert.equal(storage.saveUserQuestionnaires([q]), false);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("Blocked"); } });
    assert.deepEqual(storage.loadUserQuestionnaires(), []);
    assert.equal(storage.saveUserQuestionnaires([q]), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});
