import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const EXPECTED_COUNTS = {
  AOS: 18, BFS: 16, "Bournemouth Neck": 7, DHI: 18, Edinburgh: 6,
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

before(async () => {
  server = await createServer({
    configFile: false, root,
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [{
      name: "questionnaire-store-fixture", enforce: "pre",
      load(id) {
        if (id.endsWith("/src/state/questionnairesStore.tsx")) {
          return `export const testStore = { all: [], selectedId: null, select(id) { this.selectedId = id; } };
            export function useQuestionnairesStore() { return testStore; }`;
        }
      },
    }],
  });
  const { parseZurichCsvText } = await server.ssrLoadModule("/src/core/csvZurich.ts");
  ({ scoreQuestionnaire } = await server.ssrLoadModule("/src/core/scoring.ts"));
  ({ QUESTIONNAIRE_REGIONS: regions } = await server.ssrLoadModule("/src/questionnaires/regions.ts"));
  ({ testStore } = await server.ssrLoadModule("/src/state/questionnairesStore.tsx"));
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
function byId(id) { return questionnaires.find((q) => q.id === id); }
function numericAnswers(q, maximum = false) {
  return Object.fromEntries(questionsOf(q).map((question) => {
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
  assert.equal(new Set(questionnaires.map((q) => q.id)).size, 22);
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
      assert.ok(question.options.length >= 2);
      assert.equal(new Set(question.options.map((option) => option.value)).size, question.options.length, question.id);
      assert.ok(question.options.every((option) => option.label_ar.trim()));
    }
  });
  test(`${id}: real form renders all questions, answer controls and the selected region button`, () => {
    testStore.selectedId = id;
    const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
    assert.equal((html.match(/class="question-legend"/g) ?? []).length, count);
    assert.equal((html.match(/type="radio"/g) ?? []).length,
      questionsOf(byId(id)).reduce((sum, question) => sum + question.options.length, 0) + (id === "PSS" ? 7 : 0));
    for (const question of questionsOf(byId(id))) assert.ok(html.includes(`name="${id}-${question.id}"`));
    const picker = renderToStaticMarkup(React.createElement(QuestionnairePicker));
    assert.equal((picker.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.equal((picker.match(/class="region-questionnaire"/g) ?? []).length, 22);
  });
  test(`${id}: blank submission is incomplete and both numeric endpoints produce finite results`, () => {
    const q = byId(id);
    assert.equal(scoreQuestionnaire(q, {}).status, "incomplete");
    for (const maximum of [false, true]) {
      const result = scoreQuestionnaire(q, numericAnswers(q, maximum));
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
        return [question.id, question.options[seed % question.options.length].value];
      }));
      const result = scoreQuestionnaire(q, answers);
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
  assert.ok(questionnaires.some((q) => q.id === "CPGS" || /Chronic Pain Grade/i.test(q.title_ar)), "CPGS is absent from the manifest and region picker");
});

for (const id of ["HOOS", "Bournemouth Neck", "Zurich", "Edinburgh"]) {
  test(`${id}: source patient-information fields have entry controls`, () => {
    testStore.selectedId = id;
    const html = renderToStaticMarkup(React.createElement(QuestionnaireRunner));
    const labels = id === "HOOS" ? ["اسم المريض", "رقم الملف الطبي للمريض", "التاريخ"] : ["اسم المريض", "تاريخ الولادة", "الجنس", "رقم الهاتف"];
    for (const label of labels) assert.ok(html.includes(label), `Missing source field: ${label}`);
    assert.ok(/type="(?:text|date|tel)"/.test(html), "No patient text/date/phone entry control");
  });
}
