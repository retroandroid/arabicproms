import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, source, scoreQuestionnaire, bournemouth, hoos;
before(async () => {
  source = JSON.parse(await readFile(new URL("./fixtures/scoring-documents-2026-10-28.json", import.meta.url), "utf8"));
  server = await createServer({ configFile: false, root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { parseZurichCsvText } = await server.ssrLoadModule("/src/core/csvZurich.ts");
  ({ scoreQuestionnaire } = await server.ssrLoadModule("/src/core/scoring.ts"));
  for (const id of ["Bournemouth Neck", "HOOS"]) {
    const q = parseZurichCsvText(await readFile(new URL(`../public/questionnaires/${id}.csv`, import.meta.url), "utf8"), id);
    if (id === "HOOS") hoos = q; else bournemouth = q;
  }
});
after(() => server?.close());
const questionsOf = (q) => q.items.filter((item) => item.type === "question");
function result(q, answers) {
  const outcome = scoreQuestionnaire(q, answers);
  assert.equal(outcome.status, "ready", outcome.note_ar);
  return outcome;
}
function answersFromRawSums(raws) {
  const values = [];
  source.hoos.groups.forEach((group, index) => {
    let remaining = raws[index];
    for (let i = 0; i < group.count; i++) {
      const value = Math.min(4, remaining);
      values.push(value); remaining -= value;
    }
    assert.equal(remaining, 0);
  });
  return Object.fromEntries(questionsOf(hoos).map((question, index) => [question.id, index === 0 ? "R" : values[index - 1]]));
}

test("Bournemouth scoring document: seven integer 0–10 scales total 70, with no extra score inputs", () => {
  const questions = questionsOf(bournemouth);
  assert.equal(questions.length, source.bournemouth.questionCount);
  for (const question of questions) assert.deepEqual(question.options.map((option) => option.value), Array.from({ length: 11 }, (_, index) => index));
  assert.equal(questions.reduce((sum, question) => sum + Math.max(...question.options.map((option) => option.value)), 0), source.bournemouth.denominator);
});

test("Bournemouth scoring document: independent raw-17 example normalizes to 24.3, retaining precision", () => {
  const example = source.bournemouth.regressionExample;
  const answers = Object.fromEntries(questionsOf(bournemouth).map((question, index) => [question.id, example.answers[index]]));
  const score = result(bournemouth, answers);
  assert.equal(score.metrics.length, 1);
  assert.equal(score.metrics[0].value, 17 / 70 * 100);
  assert.equal(score.metrics[0].display_ar, example.display);
  assert.match(score.direction_ar, /Lower score = better/);
});

test("Bournemouth scoring document: zero is best and all tens are worst without reversing responses", () => {
  for (const [value, expected] of [[0, 0], [5, 50], [10, 100]]) {
    const answers = Object.fromEntries(questionsOf(bournemouth).map((question) => [question.id, value]));
    assert.equal(result(bournemouth, answers).metrics[0].value, expected);
  }
});

test("HOOS scoring document: right/left hip comes before the 40 questions and all use exactly five coded choices", () => {
  const [side, ...questions] = questionsOf(hoos);
  assert.equal(questions.length, source.hoos.groups.reduce((sum, group) => sum + group.count, 0));
  assert.equal(side.text_ar, "الورك المصاب");
  assert.deepEqual(side.options.map((option) => [option.value, option.label_ar]), source.hoos.sideOptions);
  for (const question of questions) assert.deepEqual(question.options.map((option) => [option.value, option.label_ar]), source.hoos.options);
});

test("HOOS scoring document: summary is the mean of five subscales, not a weighted raw-total percentage", () => {
  const example = source.hoos.regressionExample;
  const score = result(hoos, answersFromRawSums(example.raws));
  assert.deepEqual(score.metrics.map((metric) => metric.key), [...source.hoos.groups.map((group) => group.key), "summary_score"]);
  assert.deepEqual(score.metrics.map((metric) => metric.value), [...example.scores, example.summary]);
  assert.equal(score.metrics.at(-1).display_ar, "45.0%");
  assert.notEqual(score.metrics.at(-1).value, example.raws.reduce((sum, value) => sum + value, 0) / 160 * 100);
});

test("HOOS scoring document: every section boundary uses its own denominator without altering other subscales", () => {
  const questions = questionsOf(hoos).slice(1);
  const baseline = answersFromRawSums([0, 0, 0, 0, 0]);
  let start = 0;
  for (const group of source.hoos.groups) {
    for (const index of [start, start + group.count - 1]) {
      const changed = result(hoos, { ...baseline, [questions[index].id]: 4 });
      for (const metric of changed.metrics) {
        const expected = metric.key === "summary_score" ? 4 / group.denominator * 100 / 5
          : metric.key === group.key ? 4 / group.denominator * 100 : 0;
        assert.ok(Math.abs(metric.value - expected) < 1e-10, `${group.key}: ${metric.key}`);
      }
    }
    start += group.count;
  }
});

test("HOOS scoring document: round only displayed scores after averaging unrounded subscale values", () => {
  const score = result(hoos, answersFromRawSums([1, 3, 1, 3, 1]));
  const expected = (1 / 20 * 100 + 3 / 40 * 100 + 1 / 68 * 100 + 3 / 16 * 100 + 1 / 16 * 100) / 5;
  assert.equal(score.metrics.at(-1).value, expected);
  assert.equal(score.metrics.at(-1).display_ar, `${expected.toFixed(1)}%`);
});

test("HOOS scoring document: side and patient metadata never change subscale or summary scores", () => {
  const answers = answersFromRawSums(source.hoos.regressionExample.raws);
  const baseline = result(hoos, answers).metrics;
  const sideId = questionsOf(hoos)[0].id;
  for (const value of ["R", "L"]) {
    assert.deepEqual(result(hoos, { ...answers, [sideId]: value, name: "Test", birthDate: "1990-01-01", phone: "00000000" }).metrics, baseline);
  }
  const missingSide = { ...answers }; delete missingSide[sideId];
  assert.deepEqual(result(hoos, missingSide).metrics, baseline);
});
