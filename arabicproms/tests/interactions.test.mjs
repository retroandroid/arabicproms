import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

// In-memory DOM component tests: no browser, HTTP server or live website access.
let server, dom, createRoot, root, container, App, Runner, Provider, Context, useStore;
let fetchOriginal;
let failLoads = false;
const globals = new Map();
function install(name, value) {
  globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
async function fixtureFetch(url) {
  if (failLoads) throw new Error("Simulated offline");
  return new Response(await readFile(new URL(`../public${decodeURIComponent(url)}`, import.meta.url), "utf8"));
}
before(async () => {
  dom = new JSDOM('<!doctype html><html><body><div id="test-root"></div></body></html>', { url: "https://questionnaire.test/" });
  for (const name of ["window", "document", "HTMLElement", "HTMLInputElement", "Event", "MouseEvent", "KeyboardEvent"]) install(name, dom.window[name]);
  install("IS_REACT_ACT_ENVIRONMENT", true);
  install("localStorage", dom.window.localStorage);
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = fixtureFetch;
  ({ createRoot } = await import("react-dom/client"));
  server = await createServer({ configFile: false, root: fileURLToPath(new URL("..", import.meta.url)),
    esbuild: { jsx: "automatic" }, server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] } });
  ({ default: App } = await server.ssrLoadModule("/src/App.tsx"));
  ({ QuestionnaireRunner: Runner } = await server.ssrLoadModule("/src/ui/QuestionnaireRunner.tsx"));
  ({ QuestionnairesProvider: Provider } = await server.ssrLoadModule("/src/state/questionnairesStore.tsx"));
  ({ QuestionnairesContext: Context, useQuestionnairesStore: useStore } = await server.ssrLoadModule("/src/state/questionnairesContext.ts"));
  container = document.getElementById("test-root");
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  failLoads = false;
  globalThis.fetch = fixtureFetch;
  dom.window.localStorage.clear();
});
after(async () => {
  await server?.close();
  globalThis.fetch = fetchOriginal;
  dom?.window.close();
  for (const [name, descriptor] of globals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  }
});
async function mount(element = React.createElement(App)) {
  root = createRoot(container);
  await act(async () => { root.render(element); });
}
async function until(condition) {
  const deadline = Date.now() + 3000;
  while (!condition()) {
    assert.ok(Date.now() < deadline, "component did not reach expected state");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
}
function button(text) { return [...container.querySelectorAll("button")].find((el) => el.textContent.trim() === text); }
async function choose(id) {
  await act(async () => button(id).click());
  assert.ok(container.querySelector("form"));
}
async function input(el, value) {
  assert.ok(el, "input must exist");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function submit() {
  const form = container.querySelector("form");
  const finish = form.querySelector('button[type="submit"]');
  finish.focus();
  await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}
async function complete() {
  // Metadata stays outside scored answers; use clearly fictitious patient information.
  for (const el of container.querySelectorAll(".patient-details input:not([type=radio])")) {
    await input(el, el.type === "date" ? "1990-01-01" : el.type === "tel" ? "00000000" : "Test patient");
  }
  const groups = Map.groupBy([...container.querySelectorAll("input[type=radio]")], (el) => el.name);
  await act(async () => {
    for (const radios of groups.values()) {
      const numeric = radios.filter((el) => /^\d+$/.test(el.value));
      const selected = numeric.length ? numeric.reduce((a, b) => Number(a.value) > Number(b.value) ? a : b)
        : radios.find((el) => el.value === "نعم") ?? radios[0];
      selected.click();
    }
  });
  for (const el of container.querySelectorAll('input[type="number"]')) await input(el, "0");
}

test("app loads every built-in, changes instruments and clears previous form responses", async () => {
  await mount();
  await until(() => button("PSS"));
  assert.equal(container.querySelectorAll(".region-questionnaire:not(.neck-complete-form)").length, 23);
  await choose("DHI");
  await act(async () => container.querySelector('input[type="radio"]').click());
  assert.equal(container.querySelectorAll("input:checked").length, 1);
  await choose("PSS");
  await choose("DHI");
  assert.equal(container.querySelectorAll("input:checked").length, 0);
});

test("all 23 questionnaires plus the complete neck form accept valid responses and show an outcome", async () => {
  await mount();
  await until(() => button("PSS"));
  const ids = [...container.querySelectorAll(".region-questionnaire")].map((el) => el.textContent.trim());
  for (const id of ids) {
    await choose(id);
    await complete();
    assert.equal(container.querySelector("form").checkValidity(), true, `${id}: native field validation`);
    await submit();
    const dialog = container.querySelector('[role="dialog"]');
    assert.ok(dialog, id);
    assert.ok(!dialog.textContent.includes("NaN") && !dialog.textContent.includes("Infinity"), id);
    assert.ok(!dialog.textContent.includes("الأسئلة الناقصة"), `${id}: valid responses should be complete`);
    if (id === "CPGS") assert.match(dialog.textContent, /لا تُعرض درجة سريرية/);
    else assert.ok(dialog.querySelectorAll('.score-metric').length > 0, `${id}: calculated scores must be visible`);
    await act(async () => button("إغلاق").click());
    assert.equal(container.querySelector('[role="dialog"]'), null);
  }
});

test("PSS no-shoulder branch hides activities, clears answers and finishes without a score", async () => {
  await mount(); await until(() => button("PSS")); await choose("PSS");
  await act(async () => container.querySelector('input[name="PSS-q_1"]').click());
  const no = container.querySelector('input[name="pss-shoulderProblem"][value="لا"]');
  await act(async () => no.click());
  assert.equal(container.querySelectorAll(".question-legend").length, 0);
  await submit();
  assert.equal(container.querySelector('[role="dialog"]'), null);
  assert.match(container.querySelector('[role="status"]').textContent, /لا توجد درجة PSS/);
  await act(async () => container.querySelector('input[name="pss-shoulderProblem"][value="نعم"]').click());
  assert.equal(container.querySelectorAll(".question-legend").length, 24);
  assert.equal(container.querySelectorAll('input[name^="PSS-"]:checked').length, 0);
});

test("iHOT work skip hides four controls and can be reversed without being stuck on K/L", async () => {
  await mount(); await until(() => button("iHOT-33")); await choose("iHOT-33");
  assert.equal(container.querySelectorAll(".question-legend").length, 34);
  await act(async () => container.querySelector('input[value="K"]').click());
  assert.equal(container.querySelectorAll(".question-legend").length, 30);
  await act(async () => button("إلغاء التخطي والإجابة عن أسئلة العمل").click());
  assert.equal(container.querySelectorAll(".question-legend").length, 34);
  assert.equal(container.querySelectorAll('input[value="K"]:checked, input[value="L"]:checked').length, 0);
});

test("numeric days preserve zero, reject a fractional value and clear back to an unanswered field", async () => {
  await mount(); await until(() => button("CPGS")); await choose("CPGS");
  const days = container.querySelector('input[type="number"]');
  await input(days, "0"); assert.equal(days.value, "0"); assert.equal(days.checkValidity(), true);
  await input(days, "1.5"); assert.equal(days.checkValidity(), false);
  await input(days, ""); assert.equal(days.checkValidity(), false);
});

test("result dialog takes focus, traps Tab, closes on Escape and returns focus to submit", async () => {
  await mount(); await until(() => button("DHI")); await choose("DHI");
  await submit();
  const close = button("إغلاق");
  assert.equal(document.activeElement, close);
  await act(async () => close.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })));
  assert.equal(document.activeElement, close);
  await act(async () => close.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
  assert.equal(container.querySelector('[role="dialog"]'), null);
  assert.equal(document.activeElement, container.querySelector('button[type="submit"]'));
});

test("download failure is visible and retry restores all forms without an unhandled rejection", async () => {
  failLoads = true;
  await mount(); await until(() => container.querySelector('[role="alert"]'));
  assert.equal(container.querySelectorAll(".region-questionnaire").length, 0);
  failLoads = false;
  await act(async () => button("إعادة المحاولة").click());
  await until(() => button("PSS"));
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.equal(container.querySelectorAll(".region-questionnaire:not(.neck-complete-form)").length, 23);
});

test("fresh built-ins win over stale duplicate imports and storage failures keep imports usable", async () => {
  const stale = { id: "PSS", title_ar: "Stale", items: [{ type: "question", id: "old", text_ar: "old question", options: [{ value: 0, label_ar: "No" }, { value: 1, label_ar: "Yes" }] }] };
  dom.window.localStorage.setItem("aqw_user_questionnaires_v1", JSON.stringify([stale]));
  let store;
  function Probe() { store = useStore(); return React.createElement(Runner); }
  await mount(React.createElement(Provider, null, React.createElement(Probe)));
  await until(() => !store.loading);
  assert.equal(store.all.filter(({ q }) => q.id === "PSS").length, 1);
  assert.equal(store.all.find(({ q }) => q.id === "PSS").source, "builtin");
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Blocked"); } });
  try {
    const custom = { ...stale, id: "Custom" };
    await act(async () => store.addFromUser([custom]));
    assert.ok(store.all.some(({ q }) => q.id === "Custom"));
    assert.equal(store.storageError, true);
    await act(async () => store.select("Custom"));
    assert.match(container.textContent, /old question/);
    await act(async () => store.removeUser("Custom"));
    assert.ok(!store.all.some(({ q }) => q.id === "Custom"));
  } finally { Object.defineProperty(globalThis, "localStorage", original); }
});

test("missing fields use the incomplete outcome without inventing a score", async () => {
  const { parseZurichCsvText } = await server.ssrLoadModule("/src/core/csvZurich.ts");
  const q = parseZurichCsvText(await readFile(new URL("../public/questionnaires/DHI.csv", import.meta.url), "utf8"), "DHI");
  await mount(React.createElement(Context.Provider, { value: { all: [{ q, source: "builtin" }], selectedId: q.id } }, React.createElement(Runner)));
  await submit();
  assert.match(container.querySelector('[role="dialog"]').textContent, /الأسئلة الناقصة: 18/);
});

test("HOOS scoring document: the real form displays five source subscales and the independent 45% summary", async () => {
  await mount(); await until(() => button("HOOS")); await choose("HOOS");
  await complete();
  const groups = Map.groupBy([...container.querySelectorAll('input[type="radio"]')].filter((el) => el.name.startsWith("HOOS-") && /^\d+$/.test(el.value)), (el) => el.name);
  assert.equal(groups.size, 40);
  await act(async () => {
    [...groups.values()].forEach((radios, index) => {
      const value = index < 5 ? 4 : index < 15 ? 0 : index < 36 ? 2 : 1;
      radios.find((el) => Number(el.value) === value).click();
    });
  });
  await submit();
  assert.deepEqual([...container.querySelectorAll(".score-metric")].map((row) => row.lastElementChild.textContent), ["100.0%", "0.0%", "50.0%", "50.0%", "25.0%", "45.0%"]);
});

test("Bournemouth scoring document: mixed 0–10 responses display raw-17 normalization through the real form", async () => {
  await mount(); await until(() => button("Bournemouth Neck")); await choose("Bournemouth Neck");
  await complete();
  const groups = Map.groupBy([...container.querySelectorAll('input[type="radio"]')], (el) => el.name);
  assert.equal(groups.size, 7);
  await act(async () => {
    [...groups.values()].forEach((radios, index) => radios.find((el) => Number(el.value) === [0, 1, 2, 3, 4, 5, 2][index]).click());
  });
  await submit();
  assert.equal(container.querySelectorAll(".score-metric").length, 1);
  assert.equal(container.querySelector(".score-metric").lastElementChild.textContent, "24.3 / 100");
});

for (const [id, name] of [["PSS", "pss-dominantHand"], ["Zurich", "Zurich-patient-dominantHand"]]) {
  test(`${id}: screenshot dominant-hand question appears once, requires one choice and does not affect scores`, async () => {
    await mount(); await until(() => button(id)); await choose(id);
    const groups = [...container.querySelectorAll(".patient-details fieldset")].filter((fieldset) => fieldset.querySelector("legend").textContent.includes("اليد المهيمنة"));
    assert.equal(groups.length, 1);
    const group = groups[0];
    assert.match(group.querySelector("legend").textContent, /^5\. اليد المهيمنة/);
    assert.equal(group.querySelector(".single-choice-hint").textContent, "اختر إجابة واحدة فقط.");
    const choices = [...group.querySelectorAll('input[type="radio"]')];
    assert.deepEqual(choices.map((el) => el.value), ["اليمنى", "اليسرى", "كلاهما"]);
    assert.ok(choices.every((el) => el.name === name && el.required && document.querySelector(`label[for="${el.id}"]`)));
    assert.equal(choices.every((el) => el.checkValidity()), false);
    await complete();
    await submit();
    const baseline = [...container.querySelectorAll(".score-metric")].map((row) => row.textContent);
    assert.ok(baseline.length > 0);
    await act(async () => button("إغلاق").click());
    for (const choice of choices) {
      await act(async () => choice.click());
      assert.equal(group.querySelectorAll("input:checked").length, 1);
      assert.equal(group.querySelector("input:checked").value, choice.value);
      assert.equal(choices.every((el) => el.checkValidity()), true);
      await submit();
      assert.deepEqual([...container.querySelectorAll(".score-metric")].map((row) => row.textContent), baseline);
      await act(async () => button("إغلاق").click());
    }
    assert.match(container.querySelector("form").textContent, id === "PSS" ? /30 \/ 30/ : /23 \/ 23/);
  });
}
