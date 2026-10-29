import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server, source, scoreQuestionnaire, parseCsv, forms, patientFields;
before(async () => {
  source = JSON.parse(await readFile(new URL("./fixtures/foot-ankle-sources-2026-10-29.json", import.meta.url), "utf8"));
  server = await createServer({ configFile: false, root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  ({ parseZurichCsvText: parseCsv } = await server.ssrLoadModule("/src/core/csvZurich.ts"));
  ({ scoreQuestionnaire } = await server.ssrLoadModule("/src/core/scoring.ts"));
  ({ SOURCE_PATIENT_FIELDS: patientFields } = await server.ssrLoadModule("/src/questionnaires/patientFields.ts"));
  forms = Object.fromEntries(await Promise.all(["BFS", "FAAM", "FAOS", "AOS"].map(async (id) => [id,
    parseCsv(await readFile(new URL(`../public/questionnaires/${id}.csv`, import.meta.url), "utf8"), id)])));
});
after(() => server?.close());
const questions = (id) => forms[id].items.filter((item) => item.type === "question");
const normalize = (text) => text.normalize("NFKC").replace(/\s+/g, "");
const faamScored = () => questions("FAAM").filter((q) => q.options.some((option) => option.value === "X"));
function answersFor(id, maximum = false) {
  return Object.fromEntries(questions(id).map((q) => {
    if (q.input) return [q.id, maximum ? q.input.max : q.input.min];
    const options = q.options.filter((option) => typeof option.value === "number" && !(id === "BFS" && option.value === 9));
    const value = options.length ? (maximum ? Math.max : Math.min)(...options.map((o) => o.value)) : q.options[0].value;
    return [q.id, value];
  }));
}
function result(id, answers) {
  const outcome = scoreQuestionnaire(forms[id], answers);
  assert.equal(outcome.status, "ready", outcome.note_ar);
  return outcome;
}
const metricMap = (outcome) => Object.fromEntries(outcome.metrics.map((metric) => [metric.key, metric.value]));

for (const id of ["BFS", "FAAM", "FAOS"]) {
  test(`${id}: all workbook clinical prompts and inspected answer mappings match in source order`, () => {
    const actual = id === "BFS" ? questions(id).slice(1) : id === "FAAM" ? faamScored() : questions(id);
    const expected = source[id].questions;
    assert.equal(actual.length, expected.length);
    actual.forEach((q, index) => {
      assert.equal(normalize(q.text_ar), normalize(expected[index].text_ar), `${id}: ${expected[index].cell}`);
      assert.deepEqual(q.options.map((o) => [o.value, normalize(o.label_ar)]), expected[index].options.map((o) => [o.value, normalize(o.label_ar)]), `${id}: ${expected[index].cell}`);
    });
  });
}

test("BFS: missing severe choices and shoe points are restored from the workbook", () => {
  const q = questions("BFS").slice(1);
  for (const activity of q.slice(0, 4)) assert.deepEqual(activity.options.map((o) => o.value), [9, 5, 4, 3, 2, 1]);
  assert.deepEqual(q[10].options.map((o) => o.value), [6, 5, 4, 3, 2]);
  assert.deepEqual(q[12].options.map((o) => o.value), [5, 4, 3, 2, 1]);
});

test("BFS: restored answer values prove the 16–79 range and the printed 15–73 inconsistency", () => {
  const minimum = metricMap(result("BFS", answersFor("BFS")));
  const maximum = metricMap(result("BFS", answersFor("BFS", true)));
  assert.deepEqual([minimum.raw_score, maximum.raw_score], [16, 79]);
  assert.deepEqual([minimum.total_score, maximum.total_score], [0, 100]);
  assert.equal((79 - 15) / 58 * 100 > 100, true);
  const outcome = result("BFS", answersFor("BFS"));
  assert.match(outcome.metrics[0].label_ar, /المعدّلة/);
  assert.match(outcome.note_ar, /16 إلى 79/);
  assert.match(outcome.note_ar, /15–73/);
  assert.match(outcome.note_ar, /لا يُدّعى تكافؤها/);
});

test("BFS: TV example is excluded and all 15 real responses contribute", () => {
  const baseline = answersFor("BFS");
  const example = questions("BFS")[0];
  for (const option of example.options) assert.deepEqual(result("BFS", { ...baseline, [example.id]: option.value }).metrics, result("BFS", baseline).metrics);
  const noExample = { ...baseline }; delete noExample[example.id];
  assert.deepEqual(result("BFS", noExample).metrics, result("BFS", baseline).metrics);
  for (const q of questions("BFS").slice(1)) {
    const next = Math.max(...q.options.filter((o) => o.value !== 9).map((o) => o.value));
    assert.ok(metricMap(result("BFS", { ...baseline, [q.id]: next })).total_score > 0, q.text_ar);
  }
});

test("BFS: all 16 N/A combinations exclude code 9 from raw and attainable ranges", () => {
  for (let mask = 0; mask < 16; mask++) {
    let excluded = 0;
    for (const maximum of [false, true]) {
      const answers = answersFor("BFS", maximum);
      questions("BFS").slice(1, 5).forEach((q, index) => { if (mask & (1 << index)) answers[q.id] = 9; });
      excluded = mask.toString(2).replaceAll("0", "").length;
      const metrics = metricMap(result("BFS", answers));
      assert.equal(metrics.raw_score, maximum ? 79 - 5 * excluded : 16 - excluded);
      assert.equal(metrics.total_score, maximum ? 100 : 0);
    }
    const partial = answersFor("BFS");
    questions("BFS").slice(1, 5).forEach((q, index) => { partial[q.id] = mask & (1 << index) ? 9 : 3; });
    assert.equal(metricMap(result("BFS", partial)).total_score, (2 * (4 - excluded)) / (63 - 4 * excluded) * 100);
  }
});

test("FAAM: all three supplementary workbook questions appear in their proper positions", () => {
  const q = questions("FAAM");
  assert.equal(q.length, 31);
  assert.equal(faamScored().length, 28);
  for (const [index, expected] of [[21, source.FAAM.supplementary[0]], [29, source.FAAM.supplementary[1]], [30, source.FAAM.supplementary[2]]]) {
    assert.equal(normalize(q[index].text_ar), normalize(expected.text_ar));
    if (expected.kind === "number") assert.deepEqual(q[index].input, { type: "number", min: 0, step: "any", max: 100 });
    else assert.deepEqual(q[index].options.map((o) => [o.value, o.label_ar]), expected.options.map((o) => [o.value, o.label_ar]));
  }
});

test("FAAM: reproduces both no-N/A worked examples, ADL 63/84 = 75 and sport 14/28 = 50", () => {
  const answers = answersFor("FAAM");
  faamScored().forEach((q, index) => { answers[q.id] = index < 21 ? 3 : 2; });
  assert.deepEqual(metricMap(result("FAAM", answers)), { adl_score: 75, sports_score: 50 });
});

test("FAAM: reproduces N/A examples, ADL 57/76 = 75 and sport 18/24 = 75", () => {
  const answers = answersFor("FAAM");
  faamScored().forEach((q, index) => { answers[q.id] = index < 2 || index === 21 ? "X" : 3; });
  assert.deepEqual(metricMap(result("FAAM", answers)), { adl_score: 75, sports_score: 75 });
});

test("FAAM: self-ratings and overall function do not enter the two calculated scores", () => {
  const answers = answersFor("FAAM", true);
  const expected = result("FAAM", answers).metrics;
  const q = questions("FAAM");
  for (const rating of [0, 24.25, 100]) {
    for (const option of q[30].options) {
      const changed = { ...answers, [q[21].id]: rating, [q[29].id]: 100 - rating, [q[30].id]: option.value };
      assert.deepEqual(result("FAAM", changed).metrics, expected);
    }
  }
  for (const index of [21, 29, 30]) delete answers[q[index].id];
  assert.deepEqual(result("FAAM", answers).metrics, expected);
});

test("FAAM: percent inputs accept fractional 0–100 values and reject out-of-range/non-finite data", () => {
  const baseline = answersFor("FAAM");
  for (const q of questions("FAAM").filter((q) => q.input)) {
    for (const value of [0, 0.25, 99.99, 100]) assert.equal(scoreQuestionnaire(forms.FAAM, { ...baseline, [q.id]: value }).status, "ready");
    for (const value of [-0.01, 100.01, Infinity, NaN, "50", null]) assert.equal(scoreQuestionnaire(forms.FAAM, { ...baseline, [q.id]: value }).status, "unsupported");
  }
});

test("FAOS: missing question 31 is restored between sitting and heavy domestic duties", () => {
  const q = questions("FAOS");
  assert.equal(q.length, 42);
  assert.deepEqual(q.map((q) => Number(q.text_ar.match(/^\d+/)[0])), Array.from({ length: 42 }, (_, i) => i + 1));
  assert.match(q[30].text_ar, /الجلوس والن[هھ]وض عن المرحاض/);
  const answers = answersFor("FAOS");
  const baseline = metricMap(result("FAOS", answers));
  const changed = metricMap(result("FAOS", { ...answers, [q[30].id]: 4 }));
  assert.equal(baseline.adl_function, 100);
  assert.equal(changed.adl_function, 100 - 4 / 68 * 100);
  delete answers[q[30].id];
  assert.equal(scoreQuestionnaire(forms.FAOS, answers).status, "incomplete");
});

test("FAOS: every domain independently scores 100, 50 and 0 for raw 0, half and maximum", () => {
  const q = questions("FAOS");
  for (const value of [0, 2, 4]) {
    const answers = Object.fromEntries(q.map((q) => [q.id, value]));
    const outcome = result("FAOS", answers);
    assert.deepEqual(outcome.metrics.map((m) => m.key), source.FAOS.groups.map((group) => group.key));
    assert.deepEqual(outcome.metrics.map((m) => m.value), Array(5).fill(100 - value * 25));
    assert.match(outcome.direction_ar, /الأعلى أفضل/);
  }
});

test("FAOS: every question affects only its subscale with denominators 28/36/68/20/16", () => {
  let start = 0;
  const baseline = answersFor("FAOS");
  const q = questions("FAOS");
  for (const group of source.FAOS.groups) {
    for (let index = start; index < start + group.count; index++) {
      const changed = metricMap(result("FAOS", { ...baseline, [q[index].id]: 1 }));
      for (const key of Object.keys(changed)) assert.equal(changed[key], key === group.key ? 100 - 100 / group.denominator : 100);
    }
    start += group.count;
  }
  assert.equal(start, 42);
});

test("FAOS: ability questions 4 and 5 award zero burden to always and four to never", () => {
  for (const q of questions("FAOS").slice(3, 5)) {
    assert.equal(q.options.find((o) => o.label_ar === "دائمًا").value, 0);
    assert.equal(q.options.find((o) => o.label_ar === "أبدًا").value, 4);
    const best = answersFor("FAOS");
    best[q.id] = q.options.find((o) => o.label_ar === "دائمًا").value;
    assert.equal(metricMap(result("FAOS", best)).symptoms, 100);
  }
  assert.ok(questions("FAOS").every((q) => q.options.length === 5 && !q.options.some((o) => o.label_ar === "بدون ألم")));
});

test("foot/ankle headers contain affected side and every workbook metadata field without affecting scores", () => {
  for (const id of ["AOS", "BFS", "FAAM", "FAOS"]) {
    const side = patientFields[id].filter((field) => field.id === "affectedSide");
    assert.equal(side.length, 1);
    assert.deepEqual(side[0].options, ["اليمين", "اليسار", "كلاهما"]);
    const baseline = answersFor(id);
    for (const value of side[0].options) assert.deepEqual(result(id, { ...baseline, affectedSide: value }).metrics, result(id, baseline).metrics);
  }
  assert.deepEqual(patientFields.FAAM.map((field) => field.id), ["name", "birthDate", "affectedSide"]);
  assert.deepEqual(patientFields.FAOS.map((field) => field.id), ["name", "birthDate", "gender", "phone", "dominantLeg", "affectedSide"]);
});

test("bounded numeric CSV definitions reject malformed bounds while preserving existing integer days", () => {
  const valid = parseCsv('@number,Percent,0,any,100', 'Example').items[0];
  assert.deepEqual(valid.input, { type: "number", min: 0, step: "any", max: 100 });
  for (const csv of ['@number,Percent,0,any,-1', '@number,Percent,0,any,NaN', '@number,Percent,0,any,Infinity', '@number,Percent,0,other,100']) assert.throws(() => parseCsv(csv, "Invalid"));
  assert.deepEqual(parseCsv('@number,Days,0,1', 'Example').items[0].input, { type: "number", min: 0, step: 1 });
});


test("FAOS: awareness question 39 uses a frequency scale instead of severity words", () => {
  assert.deepEqual(questions("FAOS")[38].options.map((option) => [option.value, option.label_ar]), [
    [4, "دائمًا"], [3, "يوميًا"], [2, "أسبوعيًا"], [1, "شهريًا"], [0, "أبدًا"],
  ]);
  assert.deepEqual(source.FAOS.labelCorrectionItems, [39]);
});
