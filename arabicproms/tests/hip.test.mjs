import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ids = ["HOOS-JR", "HOOS-12", "HOOS-PS", "iHOT-12", "iHOT-33"];
let server, source, forms, scoreQuestionnaire, fields;
before(async () => {
  source = JSON.parse(await readFile(new URL("./fixtures/hip-sources-2026-11-01.json", import.meta.url), "utf8"));
  server = await createServer({ configFile: false, root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { parseZurichCsvText } = await server.ssrLoadModule("/src/core/csvZurich.ts");
  ({ scoreQuestionnaire } = await server.ssrLoadModule("/src/core/scoring.ts"));
  ({ SOURCE_PATIENT_FIELDS: fields } = await server.ssrLoadModule("/src/questionnaires/patientFields.ts"));
  forms = Object.fromEntries(await Promise.all(ids.map(async (id) => [id,
    parseZurichCsvText(await readFile(new URL(`../public/questionnaires/${id}.csv`, import.meta.url), "utf8"), id)])));
});
after(() => server?.close());
const normalize = (s) => s.normalize("NFKC").replace(/\s+/g, "");
const questions = (id) => forms[id].items.filter((item) => item.type === "question");
const clinical = (id) => id === "iHOT-12" ? questions(id).slice(1)
  : id === "iHOT-33" ? questions(id).filter((q) => q.text_ar !== "حالة العمل") : questions(id);
function answers(id, values = []) {
  return Object.fromEntries(clinical(id).map((q, index) => [q.id, values[index] ?? 0]));
}
function metrics(id, a) {
  const result = scoreQuestionnaire(forms[id], a);
  assert.equal(result.status, "ready", result.note_ar);
  return Object.fromEntries(result.metrics.map((m) => [m.key, m.value]));
}
for (const id of ids) {
  test(`${id}: every Excel clinical question, order, answer label and numeric code matches the inspected source`, () => {
    const actual = clinical(id), expected = source[id].questions;
    assert.equal(actual.length, expected.length);
    actual.forEach((q, index) => {
      assert.equal(normalize(q.text_ar), normalize(expected[index].text_ar), `${id}/${expected[index].cell}`);
      assert.deepEqual(q.options.map((o) => [o.value, normalize(o.label_ar)]),
        expected[index].options.map((o) => [o.value, normalize(o.label_ar)]), `${id}/${expected[index].cell}`);
    });
  });
}
test("iHOT-12: the requested three header fields and right/left/both side remain outside scoring", () => {
  assert.deepEqual(fields["iHOT-12"].map((f) => normalize(f.label_ar)), source["iHOT-12"].metadata.filter((f) => f.cell !== "L3").map((f) => normalize(f.label_ar)));
  assert.equal(fields["iHOT-12"].some((f) => f.id === "patientId"), false);
  assert.deepEqual(questions("iHOT-12")[0].options.map((o) => [o.value, o.label_ar]), [["R", "يمين"], ["L", "يسار"], ["B", "كلاهما"]]);
  const a = answers("iHOT-12", Array(12).fill(7));
  for (const side of ["R", "L", "B"]) assert.deepEqual(metrics("iHOT-12", { ...a, q_1: side }), metrics("iHOT-12", a));
});
test("iHOT-33: all three source work choices match J48/K48/L48 without shifting scored questions", () => {
  const status = questions("iHOT-33").find((q) => q.text_ar === "حالة العمل");
  assert.deepEqual(status.options, source["iHOT-33"].workStatus.options);
  assert.equal(status.id, "q_23");
  const a = answers("iHOT-33", Array(33).fill(5));
  assert.deepEqual(metrics("iHOT-33", { ...a, [status.id]: "J" }), metrics("iHOT-33", a));
});
test("HOOS-JR: every raw total 0–24 uses the exact Word/Excel conversion table", () => {
  for (let raw = 0; raw <= 24; raw++) {
    let remaining = raw;
    const a = Object.fromEntries(clinical("HOOS-JR").map((q) => {
      const value = Math.min(remaining, 4); remaining -= value; return [q.id, value];
    }));
    assert.deepEqual(metrics("HOOS-JR", a), { raw_score: raw, converted_score: source["HOOS-JR"].lookup[raw] });
  }
  for (const example of [[2,1,3,2,1,0], [1,2,2,3,1,0]]) {
    assert.deepEqual(metrics("HOOS-JR", answers("HOOS-JR", example)), { raw_score: 9, converted_score: 61.815 });
  }
});
test("HOOS-12: the three Word domains use 16 points each and their unrounded mean", () => {
  const a = answers("HOOS-12", [0,1,2,3, 4,3,2,1, 4,4,4,4]);
  assert.deepEqual(metrics("HOOS-12", a), { pain: 37.5, adl_function: 62.5, quality_of_life: 100, summary_score: 200/3 });
  for (const value of [0,2,4]) assert.deepEqual(Object.values(metrics("HOOS-12", answers("HOOS-12", Array(12).fill(value)))), Array(4).fill(value*25));
});
test("HOOS-12: every individual item contributes only to its Word domain and the overall mean", () => {
  const keys = ["pain", "adl_function", "quality_of_life"];
  clinical("HOOS-12").forEach((q, index) => {
    const m = metrics("HOOS-12", { ...answers("HOOS-12"), [q.id]: 1 });
    for (const [group, key] of keys.entries()) assert.equal(m[key], group === Math.floor(index/4) ? 6.25 : 0);
    assert.equal(m.summary_score, 6.25/3);
  });
});
test("HOOS-PS: reproduces Word example 7/20 = 35 and all attainable raw totals", () => {
  assert.deepEqual(metrics("HOOS-PS", answers("HOOS-PS", [1,2,0,3,1])), { physical_function_shortform: 35, raw_score: 7 });
  for (let raw = 0; raw <= 20; raw++) {
    let remaining = raw;
    const a = Object.fromEntries(clinical("HOOS-PS").map((q) => {
      const value = Math.min(remaining, 4); remaining -= value; return [q.id, value];
    }));
    assert.equal(metrics("HOOS-PS", a).physical_function_shortform, raw/20*100);
  }
});
test("iHOT-12: reproduces Word example 86/120 = 71.7 and every item has equal weight", () => {
  const a = answers("iHOT-12", [8,7,6,9,7,5,8,6,7,9,6,8]);
  assert.deepEqual(metrics("iHOT-12", a), { total_score: 86/120*100, raw_score: 86 });
  assert.equal(scoreQuestionnaire(forms["iHOT-12"], a).metrics[0].display_ar, "71.7 / 100");
  for (const q of clinical("iHOT-12")) assert.equal(metrics("iHOT-12", { ...answers("iHOT-12"), [q.id]: 10 }).total_score, 10/120*100);
});
test("iHOT-33: exact Word formula handles all 16 N/A combinations with each work choice", () => {
  const q = clinical("iHOT-33"), status = questions("iHOT-33").find((q) => q.text_ar === "حالة العمل");
  // Source rows A45, A49, A56 and A60: clinical questions 21, 23, 28 and 32.
  const naIndexes = [20,22,27,31];
  for (const workChoice of ["J", "K", "L"]) {
    for (let mask = 0; mask < 16; mask++) {
      const a = { ...answers("iHOT-33", Array(33).fill(3)), [status.id]: workChoice };
      let assessed = workChoice === "J" ? 33 : 29;
      let applicableNAs = 0;
      naIndexes.forEach((index, bit) => {
        if (!(mask & (1 << bit))) return;
        a[q[index].id] = "X";
        if (workChoice === "J" || index !== 22) { assessed--; applicableNAs++; }
      });
      if (workChoice !== "J") for (const index of [22,23,24,25]) delete a[q[index].id];
      const denominator = (workChoice === "J" ? 120 : 80) - applicableNAs;
      assert.deepEqual(metrics("iHOT-33", a), { total_score: assessed*3/denominator*100, raw_score: assessed*3, adjusted_denominator: denominator });
      delete a[q[0].id];
      assert.equal(scoreQuestionnaire(forms["iHOT-33"], a).status, "incomplete");
    }
  }
});
test("iHOT-33: reproduces BOTH Word worked examples through the real scorer, 90/118 and 66/78", () => {
  const q = clinical("iHOT-33"), status = questions("iHOT-33").find((q) => q.text_ar === "حالة العمل");
  for (const [choice, raw, denominator, displayed] of [["J",90,118,"76.3 / 100"], ["K",66,78,"84.6 / 100"], ["L",66,78,"84.6 / 100"]]) {
    const a = { ...answers("iHOT-33"), [status.id]: choice };
    a[q[20].id] = "X"; a[q[27].id] = "X";
    const excluded = choice === "J" ? [] : [22,23,24,25];
    let remaining = raw;
    q.forEach((question, index) => {
      if (excluded.includes(index)) { delete a[question.id]; return; }
      if (a[question.id] === "X") return;
      const value = Math.min(remaining, 10); remaining -= value; a[question.id] = value;
    });
    assert.equal(remaining, 0);
    assert.deepEqual(metrics("iHOT-33", a), { total_score: raw/denominator*100, raw_score: raw, adjusted_denominator: denominator });
    assert.equal(scoreQuestionnaire(forms["iHOT-33"], a).metrics[0].display_ar, displayed);
  }
});
test("iHOT-33: source-derived scores above 100 are reported without clamping or renormalization", () => {
  const status = questions("iHOT-33").find((q) => q.text_ar === "حالة العمل");
  for (const [choice, raw, denominator, total, rawDisplay] of [["J",330,120,275,"330 / 330"], ["K",290,80,362.5,"290 / 290"], ["L",290,80,362.5,"290 / 290"]]) {
    const a = { ...answers("iHOT-33", Array(33).fill(10)), [status.id]: choice };
    assert.deepEqual(metrics("iHOT-33", a), { total_score: total, raw_score: raw, adjusted_denominator: denominator });
    const outcome = scoreQuestionnaire(forms["iHOT-33"], a);
    assert.equal(outcome.metrics[1].display_ar, rawDisplay);
    assert.match(outcome.metrics[0].label_ar, /ملف الاحتساب المرفق/);
    assert.match(outcome.note_ar, /أكبر من 100/);
    assert.match(outcome.note_ar, /دون حصرها/);
  }
});
test("iHOT-33: every source numeric item contributes at the exact Word denominator", () => {
  const q = clinical("iHOT-33"), status = questions("iHOT-33").find((q) => q.text_ar === "حالة العمل");
  for (const choice of ["J", "K", "L"]) {
    const base = choice === "J" ? 120 : 80;
    const zeros = { ...answers("iHOT-33"), [status.id]: choice };
    assert.equal(metrics("iHOT-33", zeros).total_score, 0);
    q.forEach((question, index) => {
      const total = metrics("iHOT-33", { ...zeros, [question.id]: 10 }).total_score;
      assert.equal(total, choice !== "J" && [22,23,24,25].includes(index) ? 0 : 10/base*100);
    });
  }
});
test("hip sources: the two source wording anomalies remain faithful instead of silently inventing questions", () => {
  assert.match(normalize(clinical("HOOS-PS")[4].text_ar), /ركبتكالمصابة/);
  assert.equal(clinical("iHOT-33")[26].text_ar.slice(4), clinical("iHOT-33")[30].text_ar.slice(4));
});
