# React + TypeScript + Vite

Numeric questionnaire responses can use a CSV row such as
`@number,"عدد الأيام",0,1` (question text, minimum, step).
An optional fifth cell adds a maximum; `@number,"النسبة",0,any,100`
accepts any finite percentage from 0 to 100. This is used for the
CPGS days-disabled question. It creates a required numeric entry rather than
radio options. CPGS grading is unavailable until a scoring reference is supplied.
Patient header fields live in `src/questionnaires/patientFields.ts` and are
collected separately from scored question answers.

The neck region includes **استبيانات الرقبة — النموذج الكامل**, which assembles
the source PDF's four patient fields and both seven-item questionnaires in order.
It shares the standalone CSVs, so text corrections apply to both views. The
combined form reports the Bournemouth score separately from the ungraded CPGS
responses. Questionnaire JSON and CSV requests bypass the browser cache.

## Verify the application

Use Node.js 22.12 or newer and install the locked dependencies with `npm ci`.
Run `npm run check` for the questionnaire and interaction tests, repository lint,
TypeScript validation, production build and build-artifact checks. Run `npm test`
for the questionnaire and interaction suite alone. The test command runs Node's
actual test runner without worker isolation so Vite-loaded tests remain visible
and failures return a nonzero exit status.

The suite exercises all 23 CSV questionnaires and the combined neck view. DOM
interaction tests use jsdom with local fixture data and no live browser access.
Only questionnaire definitions are persisted; patient fields and answers stay in
component state and reset when changing forms.

See [the final audit](docs/final-audit-2026-10-28.md) for coverage, corrected bugs
and source limitations. Passing technical checks does not independently validate
clinical grading rules absent from the supplied references.

The [new scoring-document recheck](docs/scoring-documents-recheck-2026-10-28.md)
compares the Bournemouth, HOOS and Zurich Word references with the current forms,
including the unresolved Zurich divisor conflict.

See the [foot and ankle audit](docs/foot-ankle-audit-2026-10-29.md) for the
BFS, FAAM and FAOS workbook comparisons, affected-side fields, corrected FAOS
scoring, and the BFS source-range discrepancy.
