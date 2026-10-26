# Questionnaire audit 26 October 2026

The website does not yet contain everything in the three supplied files, and several scoring issues remain. All 22 existing questionnaires parse and render successfully. The expanded automated suite runs 135 checks: 123 pass and 12 fail. The 12 failures represent seven groups of findings; several tests expose the same underlying problem. Production build and TypeScript checks pass. Repository lint reports two existing errors.

This change adds an executable audit suite and source fixtures. It does not alter questionnaire content or scoring. Run `npm test` from the `arabicproms` application directory to reproduce the findings. A nonzero test exit is intentional while the confirmed problems remain unresolved.

## Supplied source comparison

Sources inspected were `HOOS.xlsx`, `استبيانات الرقبة - Google Forms.pdf`, and `استبيانات العرج - Google Forms.pdf`. The workbook was inspected cell by cell, and all 13 PDF pages were rendered and visually checked. Source files were left unchanged.

| Source | Present on the website | Missing or different |
| --- | --- | --- |
| HOOS workbook | All 40 scored questions match after Unicode and whitespace normalization. All five response values match 0–4. Affected hip side is present. Five subscale calculations match the Score Calculation sheet's denominators 20, 40, 68, 16 and 16. | Patient name, medical record number, date and the opening instruction paragraph are missing. The site adds an average summary score beyond the workbook's five subscores. |
| Neck PDF | All seven Bournemouth question texts and numeric values 0–10 are present. | The complete seven-question Chronic Pain Grade Scale is absent, including the numeric days-disabled question. Patient name, birth date, gender and phone controls are absent. Bournemouth questions 2–7 incorrectly reuse pain endpoint descriptions. Study introduction and closing text are absent. |
| Claudication PDF | The seven Zurich symptom questions, four walking questions shown in the PDF, and six Edinburgh questions are represented. | Patient name, birth date, gender and phone controls are absent. Zurich walking choices use miles, blocks and feet instead of the PDF's km/m thresholds. The website includes an additional grocery-shopping item and six postoperative satisfaction questions not present in this PDF. Edinburgh relief and location choices differ from the PDF. Study introduction and closing text are absent. |

The HOOS workbook contains an internal scoring presentation conflict: the questionnaire sheet prints `100 - ...` beside result lines, while the Score Calculation sheet explicitly uses `raw / maximum × 100` and says lower is better. The website follows the latter. This audit does not silently reverse that interpretation.

The Edinburgh PDF's two relief choices both describe disappearance within ten minutes; the website instead offers relief within ten minutes versus no relief within ten minutes. The PDF labels the first location simply “الساق”, while the website distinguishes calf, shin and other locations. These differences require source clarification before replacing the existing choices; the supplied PDF is not a scoring manual.

## Confirmed failures

| Priority | Finding | Reproduction and implication |
| --- | --- | --- |
| High | iHOT-33 normalization is wrong for the visible 33-item scale. | Selecting 10 for every scored question gives 275/100 without a work skip, or 362.5/100 with work skipped. The calculation uses denominators 120 or 80 even though 33 or 29 numeric items remain. X responses reduce the denominator by 1 despite removing a 0–10 item. Both the range test and the endpoint test fail. |
| High | Zurich silently omits three displayed answers. | Balance, walking from bedroom to bathroom, and the last postoperative stability question are excluded from their subscales. Changing these answers leaves the score unchanged; leaving them blank can still produce a score. The index lists select 6/7 symptom items, 4/5 physical items and 5/6 satisfaction items. |
| High | FAAM reports an assessed zero when no activities are assessable. | Selecting X for every item returns ready with both subscores 0%. A zero denominator means unavailable, not zero function. |
| Medium | Bournemouth response descriptions do not match the neck PDF. | Questions about interference, anxiety, depression, work and control all display “لا ألم” and “أسوأ ألم ممكن” as endpoints. These labels can mislead respondents even though numeric summation works. |
| Medium | Zurich distance options differ from the supplied PDF. | The PDF specifies over 3 km; over 200 m but under 3 km; over 15 m but under 200 m; under 15 m. The site instead displays miles, blocks and feet. |
| Medium | CPGS is missing entirely. | No CPGS questionnaire exists in the manifest, body-region list or form data. Its scoring rules are not supplied in these PDFs. Adding the questionnaire requires supporting its open numeric days response, not just radio choices. |
| Medium | Source patient-information fields are missing from four forms. | HOOS lacks three workbook fields; Bournemouth, Zurich and Edinburgh lack the PDFs' four demographic fields. Existing PSS-only patient fields do not supply fields for these other forms. Four separate tests fail. |

## Coverage of all existing questionnaires

“Technical pass” means CSV integrity, rendered question and radio counts, a single selected picker button, blank-answer protection, numeric endpoint calculations, required-answer omission checks and deterministic valid-option scenarios passed. It is not a claim that the original clinical scoring manuals for all 22 instruments were available or independently validated.

| Questionnaire | Questions in CSV | Result |
| --- | ---: | --- |
| AOS | 18 | Technical pass |
| BFS | 16 | Technical pass; introductory question correctly excluded from score |
| Bournemouth Neck | 7 | Technical scoring passes; source response descriptions and demographics fail |
| DHI | 18 | Technical pass |
| Edinburgh | 6 | Technical scoring passes; demographics absent and source choices differ |
| FAAM | 28 | Normal submissions pass; all-X handling fails |
| FAOS | 41 | Technical pass; previously documented source scoring inconsistencies remain unverified |
| HOOS-12 | 12 | Technical pass |
| HOOS-JR | 6 | Technical pass |
| HOOS-PS | 5 | Technical pass |
| HOOS | 41 including affected side | Workbook question and five-domain calculation comparisons pass; patient fields absent |
| iHOT-12 | 13 including affected side | Technical pass; raw 0–120 is correctly distinguished from percentage |
| iHOT-33 | 34 including work status | Renders and loads; normalized score range and endpoint tests fail |
| KOOS-12 | 12 | Technical pass |
| KOOS-JR | 7 | Technical pass |
| LLTQ | 40 including importance questions | Technical pass; only ability responses enter the score |
| MHQ | 62 | Technical pass; existing local scoring conventions are not newly clinically validated |
| PSS | 24 plus six separate patient fields | Technical pass, including the 12 existing scoring regression tests |
| QBS | 20 | Technical pass |
| SFI-10 | 11 | Technical pass |
| SFI | 26 including injury location | Technical pass; injury location correctly excluded from score |
| Zurich | 18 | Loads and renders; three displayed answers are ignored and source distance choices differ |

## Verification and limits

- Production Vite build: passed.
- Full TypeScript project check: passed.
- Automated test suite: 123 passed, 12 failed, zero skipped or marked todo.
- All 22 forms were rendered from the actual React runner. The test store supplies questionnaire selection; provider effects and real pointer/keyboard interactions are outside these static rendering checks.
- Repeated valid-option scoring scenarios were evaluated across every questionnaire. The persistent suite stops a case on its first failed assertion; the preliminary diagnostic additionally evaluated all 103 scenarios for each questionnaire.
- The manifest includes every questionnaire CSV exactly once; each questionnaire belongs to exactly one body-region group.
- Repository-wide ESLint has two existing failures: mixed hook/component exports in `src/state/questionnairesStore.tsx` and an explicit `any` in `src/ui/CsvImportPanel.tsx`.
- Live browser click-through verification was not completed; browser access was blocked in the earlier preview attempt. No workaround was used.
- No outside clinical scoring sources were substituted for the supplied files. The PDFs contain questions rather than scoring manuals, so discrepancies requiring clinical interpretation are identified explicitly.
