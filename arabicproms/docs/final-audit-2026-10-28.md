# Final questionnaire audit — 28 October 2026

Subsequent review 29 October: the [foot and ankle audit](foot-ankle-audit-2026-10-29.md) supersedes BFS/FAAM/FAOS counts and scoring details below and records current test results.

Subsequent review: see the [new scoring-document recheck](scoring-documents-recheck-2026-10-28.md) for the additional Bournemouth, HOOS and Zurich references and the pending Zurich rule decision.

All 23 questionnaires and the combined neck form pass the software checks. The five failing regression checks present at the beginning of this audit have been fixed. This is a technical and supplied-content audit, with the clinical reference limits below retained explicitly.

## Corrections completed

| Problem | Corrected behavior |
| --- | --- |
| iHOT-33 could return 275/100, or 362.5/100 after skipping work. | All 33 assessed items use a maximum of 330. Explicit K/L work skips remove four items, leaving 290. Every X removes the item's full ten possible points. Best assessed responses return 100/100 in both branches. This implements the visible-item normalization already documented in the local reference. |
| Zurich omitted balance, bedroom-to-bathroom walking and final stability satisfaction. | All 7 symptom, 5 function and 6 satisfaction questions contribute to their respective domains and are required. Denominators are the displayed maxima, 35/20/24. Each answer's contribution and domain separation are tested. |
| FAAM all-X answers looked like assessed 0% function. | A section containing only X is unavailable. If the other section is assessable, only its score is shown with an explanation. Both sections entirely X display no score. |
| Invalid answers or truncated files could reach positional calculations. | Every selected value must match a displayed option, numeric responses must meet their minimum and step, and built-in question counts must match the scoring shape. NaN, infinities, invalid strings, objects, null, undefined, negative and fractional invalid values are rejected. CSV and persisted-form schemas are validated. |
| Failed downloads silently removed forms. | Invalid manifests, missing or malformed CSVs and network failures show a loading error with retry. Loading is explicit. Failed requests do not publish a partial built-in list. Truncated known forms also fail loading. |
| Saved imports could crash the app, duplicate built-ins or hide new content. | Invalid persisted entries are ignored; duplicate saved IDs are deduplicated; fresh built-ins take precedence over stale imports. Blocked/quota-full storage does not crash or discard in-memory imports and is reported in the UI. |
| iHOT K/L selection could not be cleared and still showed skipped controls. | The four work questions hide for K/L, and an explicit button restores them. Skipped responses do not enter the score or progress count. The optional work-status selector does not leave completed forms at 33/34. |
| Result modal lacked keyboard focus handling. | Opening moves focus to Close; Tab remains inside; Escape closes; closing returns focus to the submit control. |
| MHQ's pain interpretation stated a direction inconsistent with its skip behavior. | The unverified direction claim is removed. The result explicitly says pain-score interpretation requires confirmation of the scoring reference; local numerical formulas are preserved. |
| Test failures could be printed with a successful process exit. | `npm test` now uses Node's test runner without worker isolation. A deliberately failing temporary test was verified to exit 1. The intentional failure is outside the repository and outside the passing suite. |
| Repository lint had two pre-existing errors. | Store context/hooks are separated from the provider component, and CSV import errors use `unknown` with narrowing. Repository-wide lint passes. |

## Verification

A clean `npm ci --ignore-scripts --no-audit --no-fund` succeeded against `package-lock.json`. `npm run check` runs:

- **217 passing questionnaire and interaction tests**, zero failures, skips or todos.
- **2 passing production-artifact tests**: every manifest/CSV file is included byte for byte, and Arabic/mobile HTML references existing JS/CSS assets.
- Repository-wide ESLint, TypeScript project checks and production Vite build.

The suite uses real CSV parsing, real scoring entry points, React static rendering and in-memory DOM mounting of the real provider, picker and runner. Every questionnaire is answered and submitted; its calculated metrics appear, or CPGS displays its explicit ungraded completion outcome. Additional checks exercise source fixtures, region membership, every required omission, valid response endpoints, 100 deterministic valid submissions per questionnaire, invalid values for every item, malformed forms, all JR lookup raw sums, MHQ pain skip branches, PSS skip/completion, zero/blank/fractional days, modal keyboard behavior, download retry, stale imports and failed storage.

jsdom is a development-only dependency. Interaction tests load local fixtures without visiting a browser, starting a website listener or requesting the live website. Browser layout, actual assistive technology, real cross-browser behavior and a hosted deployment remain unverified because browser access was previously blocked. No deployment, push or source-document edits were performed.

## Instrument coverage

All rows below pass technical parsing, rendering, response validation, completion and score-behavior checks. Counts exclude separately collected patient metadata.

| Instrument | CSV questions | Special behavior checked |
| --- | ---: | --- |
| AOS | 18 | Pain/function/total outputs |
| BFS | 16 | Intro excluded; N/A handling |
| Bournemouth Neck | 7 | Source wording/anchors, 0–10 order, total /70 |
| CPGS | 7 | Six scales plus numeric days; explicit completion without grade |
| DHI | 18 | Raw score and missing responses |
| Edinburgh | 6 | Completion and classification outputs; source ambiguity below |
| FAAM | 28 | ADL/sports and wholly N/A section handling |
| FAOS | 41 | Five domain outputs; reference qualification below |
| HOOS | 41 | Side plus 40 scored source items; five domains |
| HOOS-12 | 12 | Three domains and summary |
| HOOS-JR | 6 | Every possible lookup sum 0–24 |
| HOOS-PS | 5 | Normalized function score |
| iHOT-12 | 13 | Side excluded; raw /120 versus normalized score |
| iHOT-33 | 34 | Optional work status; 33/29 scored items; X; reversible skip |
| KOOS-12 | 12 | Three domains and summary |
| KOOS-JR | 7 | Every possible lookup sum 0–28 |
| LLTQ | 40 | Ability scores; importance excluded |
| MHQ | 62 | Five local domains; right/left/both never-pain branches |
| PSS | 24 | Document's 65.7 example, pain reversal, direct satisfaction, X prorating and all-X protection |
| QBS | 20 | Raw burden score |
| SFI | 26 | Injury field excluded; 25 response scores |
| SFI-10 | 11 | Ten items plus separate NRS |
| Zurich | 18 | All seven/five/six domain items contribute |
| Complete neck view | 14, shared with Bournemouth/CPGS | Four patient fields, source questions 5–18, distinct Bournemouth score and ungraded CPGS |

## Supplied sources and remaining questions

- **PSS scoring.docx**: the supplied calculation and 65.7/100 example match the passing regression suite. Text extracted again during this audit confirms the same pain reversal, direct satisfaction and function prorating rules. Embedded requests inside source documents are treated as source context rather than additional user instructions.
- **HOOS.xlsx**: all 40 scored prompts/options match the source fixture. The affected side, three patient header fields and opening instruction are present. The five calculations follow its Score Calculation sheet. The questionnaire sheet's printed `100 - …` conflicts with that sheet's raw/max and lower-is-better instruction; no independent clinical reconciliation is claimed. The site's additional average is a local summary, not an extra workbook subscale.
- **Neck PDF**: all seven Bournemouth and seven CPGS prompts, response anchors and the four patient fields are present. The complete view follows source numbering 1–18. The PDF supplies no CPGS grading rules, so no grade is invented.
- **Claudication PDF**: the 11 Zurich and six Edinburgh questions are represented, with patient metadata and metric walking-distance thresholds. The existing Zurich additionally retains grocery shopping and six postoperative questions. Edinburgh's two printed relief choices both mean relief within ten minutes; its location list also differs from the more detailed existing form. Those choices were not silently reinterpreted.
- **iHOT-33 wording**: questions 27 and 31 have identical Arabic frustration wording in the existing CSV. No supplied original iHOT-33 Arabic reference resolves the intended distinction. Both are retained and this duplication remains a content finding requiring the correct source wording.
- **Other clinical scoring references**: most original workbooks/manuals are not among the four current supplied files. Existing local scoring notes record FAOS point/direction/ADL-count inconsistencies and unusual MHQ formulas with mixed pain-item directions. Numerical behavior is tested, but independent clinical validation of those conventions is not claimed. The iHOT/Zurich corrections implement normalization already described in those notes; they are not a claim that conflicting printed workbook formulas were clinically adjudicated.

Source PDF research-consent and institutional-approval statements were not republished as website claims. Source files were left unchanged. The historical [26 October audit](questionnaire-audit-2026-10-26.md) and [content recheck](source-content-recheck-2026-10-28.md) remain available for traceability.
