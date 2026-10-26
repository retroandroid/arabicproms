import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Exercise the real CSV parser and scoring entry point, without a browser or test dependency.
let server;
let scoreQuestionnaire;
let pss;
let questions;
before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ scoreQuestionnaire } = await server.ssrLoadModule("/src/core/scoring.ts"));
  const { parseZurichCsvText } = await server.ssrLoadModule("/src/core/csvZurich.ts");
  const csv = await readFile(new URL("../public/questionnaires/PSS.csv", import.meta.url), "utf8");
  pss = parseZurichCsvText(csv, "PSS");
  questions = pss.items.filter((item) => item.type === "question");
});
after(() => server?.close());

function answersFor(pain = [0, 0, 0], satisfaction = 10, activities = Array(20).fill(3)) {
  const values = [...pain, satisfaction, ...activities];
  assert.equal(values.length, 24);
  return Object.fromEntries(questions.map((question, index) => [question.id, values[index]]));
}

function metricsFor(answers) {
  const result = scoreQuestionnaire(pss, answers);
  assert.equal(result.status, "ready");
  return Object.fromEntries(result.metrics.map((metric) => [metric.key, metric]));
}

test("PSS response values match the original English form", () => {
  assert.equal(questions.length, 24);
  assert.deepEqual(questions[0].options.map((option) => option.value), Array.from({ length: 11 }, (_, i) => i));
  for (const question of questions.slice(4)) {
    assert.deepEqual(question.options.map((option) => [option.value, option.label_ar]), [
      ["X", "لم تقم به قبل الإصابة"],
      [0, "لا يمكن القيام به"],
      [1, "صعوبة كبيرة"],
      [2, "بعض الصعوبة"],
      [3, "لا صعوبة"],
    ]);
  }
});

test("reproduces the document's 65.7 / 100 worked example", () => {
  const activities = [...Array(14).fill(3), ...Array(4).fill(0), "X", "X"];
  const metrics = metricsFor(answersFor([4, 6, 8], 7, activities));
  assert.equal(metrics.pain_score.value, 12);
  assert.equal(metrics.satisfaction_score.value, 7);
  assert.equal(metrics.function_score.value, (42 / 54) * 60);
  assert.equal(metrics.function_score.display_ar, "46.7 / 60");
  assert.equal(metrics.total_score.display_ar, "65.7 / 100");
});

test("best and worst numeric responses score 100 and 0", () => {
  assert.equal(metricsFor(answersFor()).total_score.value, 100);
  assert.equal(metricsFor(answersFor([10, 10, 10], 0, Array(20).fill(0))).total_score.value, 0);
});

test("non-applicable activity pain contributes zero without reversing or prorating it", () => {
  for (const [pain, expected] of [[[7, "X", 4], 9], [[7, 4, "X"], 9], [[7, "X", "X"], 3]]) {
    assert.equal(metricsFor(answersFor(pain)).pain_score.value, expected);
  }
});

test("satisfaction is scored directly", () => {
  for (const satisfaction of [0, 7, 10]) {
    assert.equal(metricsFor(answersFor([0, 0, 0], satisfaction)).satisfaction_score.value, satisfaction);
  }
});

test("without X responses, function is the sum of all 20 activities", () => {
  const activities = Array.from({ length: 20 }, (_, i) => i % 4);
  assert.equal(metricsFor(answersFor([0, 0, 0], 10, activities)).function_score.value, 30);
});

test("X adjusts the denominator, while zero remains an assessed activity", () => {
  for (const value of [0, 1, 2, 3]) {
    const activities = [value, ...Array(19).fill("X")];
    assert.equal(metricsFor(answersFor([0, 0, 0], 10, activities)).function_score.value, value * 20);
  }
  const activities = [0, ...Array(19).fill(3)];
  assert.equal(metricsFor(answersFor([0, 0, 0], 10, activities)).function_score.value, 57);
});

test("all-X function responses cannot produce a function or total score", () => {
  const result = scoreQuestionnaire(pss, answersFor([0, 0, 0], 10, Array(20).fill("X")));
  assert.equal(result.status, "unsupported");
  assert.match(result.note_ar, /جميع الأنشطة/);
  assert.equal(result.metrics, undefined);
});

test("unanswered items are incomplete, not zero or X", () => {
  for (const index of [0, 3, 4, 23]) {
    const answers = answersFor();
    delete answers[questions[index].id];
    const result = scoreQuestionnaire(pss, answers);
    assert.equal(result.status, "incomplete");
    assert.equal(result.missingCount, 1);
  }
});

test("rejects out-of-range, fractional and invalid responses", () => {
  for (const [index, value] of [[0, "X"], [0, -1], [0, 11], [0, 1.5], [3, "X"], [4, 4], [4, -1], [4, ""], [4, "invalid"], [4, NaN], [4, undefined]]) {
    const answers = { ...answersFor(), [questions[index].id]: value };
    assert.equal(scoreQuestionnaire(pss, answers).status, "unsupported");
  }
});

test("rejects malformed forms instead of shifting the scored blocks", () => {
  const missingItem = { ...pss, items: pss.items.filter((item) => item.id !== questions[0].id) };
  const extraItem = { ...pss, items: [...pss.items, { ...questions[0], id: "extra" }] };
  assert.equal(scoreQuestionnaire(missingItem, answersFor()).status, "unsupported");
  assert.equal(scoreQuestionnaire(extraItem, answersFor()).status, "unsupported");
});

test("patient-information answers do not contribute to the score", () => {
  const answers = { ...answersFor(), name: "Test patient", birthDate: "1990-01-01", gender: "ذكر", phone: "00000000", dominantHand: "اليمنى", shoulderProblem: "نعم" };
  assert.equal(metricsFor(answers).total_score.value, 100);
});
