import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ids = ["QBS", "LLTQ", "Edinburgh", "KOOS-12", "KOOS-JR", "MHQ", "DHI"];
let server, source, forms, scoreQuestionnaire, headers, followups;
before(async () => {
  source = JSON.parse(await readFile(new URL("./fixtures/remaining-sources-2026-11-02.json", import.meta.url), "utf8"));
  server = await createServer({ configFile: false, root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  const { parseZurichCsvText } = await server.ssrLoadModule("/src/core/csvZurich.ts");
  ({ scoreQuestionnaire } = await server.ssrLoadModule("/src/core/scoring.ts"));
  ({ SOURCE_PATIENT_FIELDS: headers } = await server.ssrLoadModule("/src/questionnaires/patientFields.ts"));
  ({ SOURCE_FOLLOWUP_FIELDS: followups } = await server.ssrLoadModule("/src/questionnaires/remainingSourceFields.ts"));
  forms = Object.fromEntries(await Promise.all(ids.map(async (id) => [id,
    parseZurichCsvText(await readFile(new URL(`../public/questionnaires/${id}.csv`, import.meta.url), "utf8"), id)])));
});
after(() => server?.close());
const normalize = (s) => s.normalize("NFKC").replace(/[ی]/g, "ي").replace(/[ک]/g, "ك").replace(/[ھ]/g, "ه").replace(/[\u064b-\u065f\u0670\s]/g, "");
const questions = (id) => forms[id].items.filter((item) => item.type === "question");
const answerValues = (id, values) => Object.fromEntries(questions(id).map((q, i) => [q.id, values[i]]));
function filled(id, value) { return answerValues(id, questions(id).map(() => value)); }
function outcome(id, answers) {
  const result = scoreQuestionnaire(forms[id], answers);
  assert.equal(result.status, "ready", `${id}: ${result.note_ar}`);
  return result;
}
const metrics = (id, answers) => Object.fromEntries(outcome(id, answers).metrics.map((m) => [m.key, m.value]));
for (const id of ids) {
  test(`${id}: every source clinical question, answer label and numeric code matches in order`, () => {
    const actual = questions(id), expected = source[id].questions;
    assert.equal(actual.length, expected.length);
    actual.forEach((q, i) => {
      assert.equal(normalize(q.text_ar), normalize(expected[i].text_ar), `${id}/${expected[i].cell}`);
      assert.deepEqual(q.options.map((o) => [o.value, normalize(o.label_ar)]), expected[i].options.map((o) => [o.value, normalize(o.label_ar)]), `${id}/${expected[i].cell}`);
    });
  });
}
test("remaining sources: exact header definitions restore source fields while keeping record numbers removed", () => {
  for (const id of ["LLTQ", "DHI", "MHQ", "KOOS-12", "KOOS-JR"]) {
    // User-requested affected-side fields supplement the original worksheet headers.
    const originalFields = headers[id].filter((field) => !/^affected/.test(field.id) || id === "KOOS-JR")
      .map((field) => field.id === "affectedKnee" ? { ...field, options: field.options.slice(0, 2) } : field);
    assert.deepEqual(originalFields, source[id].headerFields, id);
    assert.ok(headers[id].every((f) => !/medicalRecord|patientId/.test(f.id)), id);
  }
});
test("MHQ: final source section restores all remaining questions and the other-background blank", () => {
  assert.deepEqual(followups.MHQ, source.MHQ.followUp);
  assert.equal(followups.MHQ.fields.filter((f) => !f.when).length, 9);
  assert.equal(followups.MHQ.fields.filter((f) => f.type === "text" && !f.when).length, 4);
  assert.equal(followups.MHQ.fields.filter((f) => f.type === "radio").length, 5);
  assert.equal(headers.MHQ.filter((f) => f.id === source.MHQ.handednessAlias.field).length, 1);
  assert.ok(followups.MHQ.fields.every((f) => f.required === false));
  assert.equal(followups.MHQ.fields.find((f) => f.id === "otherRace").when.value,
    followups.MHQ.fields.find((f) => f.id === "race").options.at(-1));
});
for (const [id, count, maximum, key] of [["QBS",20,100,"qbs_score"], ["DHI",18,90,"total_score"]]) {
  test(`${id}: every attainable raw sum is reported directly with its Word maximum`, () => {
    for (let total = 0; total <= maximum; total++) {
      let remaining = total;
      const values = Array.from({ length: count }, () => { const n = Math.min(remaining,5); remaining -= n; return n; });
      const result = outcome(id, answerValues(id, values));
      assert.deepEqual(Object.fromEntries(result.metrics.map((m) => [m.key,m.value])), { [key]: total });
      assert.equal(result.metrics[0].display_ar, `${total} / ${maximum}`);
    }
  });
}
test("DHI: Word worked example is 17/90, and exactly six response choices remain", () => {
  assert.deepEqual(metrics("DHI", answerValues("DHI", source.scoring.DHI.example)), { total_score: 17 });
  for (const q of questions("DHI")) assert.deepEqual(q.options.map((o) => o.value), [0,1,2,3,4,5]);
});
test("KOOS-JR: all 29 raw scores use the exact supplied conversion table", () => {
  for (let raw = 0; raw <= 28; raw++) {
    let remaining = raw;
    const values = Array.from({ length: 7 }, () => { const n = Math.min(remaining,4); remaining -= n; return n; });
    assert.deepEqual(metrics("KOOS-JR", answerValues("KOOS-JR", values)), { raw_score: raw, converted_score: source["KOOS-JR"].lookup[raw] });
  }
});
test("KOOS-12: source denominators and total reproduce independent unequal-domain responses", () => {
  const values = [0,1,2,3, 1,1,1,1, 2,2,2,2];
  assert.deepEqual(metrics("KOOS-12", answerValues("KOOS-12", values)), { pain: 37.5, function: 25, quality_of_life: 50, total: 37.5 });
  questions("KOOS-12").forEach((q, index) => {
    const actual = metrics("KOOS-12", { ...filled("KOOS-12", 0), [q.id]: 4 });
    for (const [group,key] of ["pain","function","quality_of_life"].entries()) assert.equal(actual[key], group === Math.floor(index/4) ? 25 : 0);
    assert.equal(actual.total, 4/48*100);
  });
});
test("LLTQ: Word example reports ADL 75 and sports 50 separately, excluding all importance answers", () => {
  const ability = questions("LLTQ").filter((q) => q.options.some((o) => o.value === 0));
  const a = Object.fromEntries(ability.map((q,i) => [q.id,i<10 ? 3 : 2]));
  const expected = { adl_subscore: 75, sport_subscore: 50 };
  assert.deepEqual(metrics("LLTQ", a), expected);
  for (const importance of [1,2,3,4]) {
    const extra = Object.fromEntries(questions("LLTQ").filter((q) => !q.options.some((o) => o.value === 0)).map((q) => [q.id,importance]));
    assert.deepEqual(metrics("LLTQ", { ...a,...extra }), expected);
  }
  ability.forEach((q,index) => {
    const zeros = Object.fromEntries(ability.map((q) => [q.id,0]));
    const m = metrics("LLTQ", { ...zeros,[q.id]:1 });
    assert.deepEqual(m, { adl_subscore:index<10 ? 2.5 : 0, sport_subscore:index<10 ? 0 : 2.5 });
    delete a[q.id]; assert.equal(scoreQuestionnaire(forms.LLTQ,a).status,"incomplete");
    a[q.id]=index<10 ? 3 : 2;
  });
});
test("LLTQ: ability is recognized from the source response scale even without app-added prompt suffixes", () => {
  const q=structuredClone(forms.LLTQ),a={};
  q.items.filter((item)=>item.type==="question").forEach((item)=>{
    item.text_ar=item.text_ar.replace(/ - (القدرة|الأهمية)$/,"");
    a[item.id]=item.options.some((o)=>o.value===0) ? 3 : 1;
  });
  const result=scoreQuestionnaire(q,a);
  assert.equal(result.status,"ready");
  assert.deepEqual(result.metrics.map((m)=>m.value),[75,75]);
});
test("MHQ: every raw response contributes without undocumented appearance or satisfaction reversals", () => {
  const baseline = filled("MHQ",2);
  const expected = [(54-5)/130*100,25,30,(16-5)/35*100,(24-5)/55*100];
  const actual = outcome("MHQ",baseline);
  assert.deepEqual(actual.metrics.map((m) => m.value),expected);
  assert.equal(actual.metrics.length,5);
  questions("MHQ").forEach((q,index) => {
    const domain = index<27 ? 0 : index<32 ? 1 : index<42 ? 2 : index<50 ? 3 : 4;
    const next = outcome("MHQ",{ ...baseline,[q.id]:3 }).metrics;
    next.forEach((metric,j) => assert.ok(Math.abs(metric.value - expected[j] - (j===domain ? 100/[130,20,50,35,55][j] : 0)) < 1e-9, q.id));
  });
});
test("MHQ: all four pain branches retain answered frequency items and skip only their follow-ups", () => {
  const q = questions("MHQ");
  for (const [right,left,raw,denominator] of [[2,2,20,50],[5,2,15,20],[2,5,15,20],[5,5,10,5]]) {
    const a = { ...filled("MHQ",2),[q[32].id]:right,[q[37].id]:left };
    for (const [index,value] of [[32,right],[37,left]]) if (value===5) q.slice(index+1,index+5).forEach((item) => { delete a[item.id]; });
    const expected = (raw-5)/denominator*100;
    assert.equal(outcome("MHQ",a).metrics[2].value,expected);
    for (let stale = 1; stale <= 5; stale++) {
      const old = { ...a };
      for (const [index,value] of [[32,right],[37,left]]) if (value===5) q.slice(index+1,index+5).forEach((item) => { old[item.id]=stale; });
      assert.equal(outcome("MHQ",old).metrics[2].value,expected);
    }
  }
});
test("MHQ: the supplied one-hand pain formula can exceed 100 and its interpretation conflict stays explicit", () => {
  const q=questions("MHQ"), a=filled("MHQ",2);
  a[q[32].id]=5;
  [4,5,5,5,5].forEach((v,i) => { a[q[37+i].id]=v; });
  const result=outcome("MHQ",a);
  assert.equal(result.metrics[2].value,120);
  assert.match(result.direction_ar,/متعارض/);
  assert.match(result.note_ar,/تتجاوز.*100/);
});
test("Edinburgh: Q1 No alone immediately produces a negative result without requiring skipped answers", () => {
  const result=outcome("Edinburgh",{ q_1:2 });
  assert.deepEqual(result.metrics.map((m)=>m.value),[0,0]);
  assert.equal(result.metrics.some((m)=>m.key==="severity"),false);
});
test("Edinburgh: all 288 response combinations follow the Word decision rule and source Q4 grades", () => {
  for (let mask=0;mask<32;mask++) {
    for (let location=1;location<=9;location++) {
      const values=Array.from({length:5},(_,i)=>(mask&(1<<i)) ? 1 : 2);
      const positive=values[0]===1 && values[1]===2 && values[2]===1 && values[4]===1 && location<=4;
      const result=outcome("Edinburgh",answerValues("Edinburgh",[...values,location]));
      const m=Object.fromEntries(result.metrics.map((m)=>[m.key,m.value]));
      assert.equal(m.ecq_result,Number(positive));
      assert.equal(m.classification,positive ? location===1 ? 2 : 1 : 0);
      assert.equal(m.severity,positive ? values[3]===1 ? 2 : 1 : undefined);
    }
  }
});
test("Edinburgh: calf takes precedence even when the same location includes thigh and buttock pain", () => {
  const q=structuredClone(forms.Edinburgh), location=q.items.filter((q)=>q.type==="question")[5];
  location.options[0].label_ar="بطة الساق مع ألم الفخذ والأرداف";
  const result=scoreQuestionnaire(q,{q_1:1,q_2:2,q_3:1,q_4:2,q_5:1,q_6:1});
  assert.equal(result.status,"ready");
  assert.equal(result.metrics.find((m)=>m.key==="classification").value,2);
});
test("remaining forms: supplementary answers and demographics do not affect calculated results", () => {
  for (const id of ["LLTQ","MHQ","DHI","KOOS-12","KOOS-JR"]) {
    const a=filled(id,id==="MHQ" ? 2 : 1), before=metrics(id,a);
    const extra=Object.fromEntries([...(headers[id]??[]),...(followups[id]?.fields??[])].map((f)=>[f.id,"arbitrary metadata"]));
    assert.deepEqual(metrics(id,{...a,...extra}),before);
  }
});
