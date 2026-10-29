# Foot and ankle questionnaire audit 29 October 2026

BFS, FAAM and FAOS have been compared with all six supplied files, including both worksheets of every workbook and all embedded images in the scoring documents. Missing questions, answer choices and patient fields have been added. FAAM calculations reproduce the supplied examples. FAOS now contains all 42 questions and uses the new reference's higher-is-better formulas. BFS's supplied numeric ranges are inconsistent, so its displayed percentage remains explicitly identified as a local adaptation rather than a validated original BFS score.

## Changes by instrument

| Instrument | Questions now present, excluding separate patient fields | Changes |
| --- | --- | --- |
| BFS | One unscored television example plus all 15 scored questions | Restored severity option 5 in the first four activity questions; restored the fifth new-shoe choice; corrected usual-shoe values from 1–5 to the workbook's 2–6. Added the workbook opening and closing instructions. Numeric choice codes are visible so different coded options remain distinguishable. |
| FAAM | 21 ADL items, an ADL self-rating, 7 sports items, a sports self-rating and an overall function classification: 31 questions | Added the two missing 0–100 numeric ratings and the four-choice classification in workbook order. Added patient name, birth date and affected side. The supplemental ratings/classification stay outside the two calculated subscales. |
| FAOS | All 42 scored questions: 7 symptoms, 9 pain, 17 ADL, 5 sports and 4 quality-of-life items | Restored question 31 about getting on/off the toilet. Added name, birth date, gender, phone and dominant leg from the workbook, plus the requested affected side. Corrected subscale formulas, the point direction of two movement-ability questions and the awareness question's frequency choices. |
| AOS | Existing 18 scored questions | Added affected side. No new AOS workbook was supplied, so this run makes no new workbook-content validation claim for AOS. |

Each of the four foot/ankle forms now has a separate required single-choice **القدم / الكاحل المصاب** field with **اليمين، اليسار، كلاهما**. Dominant leg in FAOS remains a separate question, because dominance and affected side describe different things. All 11 newly added patient-information fields stay outside clinical scoring and do not shift scored CSV IDs. The restored FAOS and FAAM questions do change their own CSV question positions, and the corresponding scoring and shape validation have been updated together.

## Source coverage

| Source | Inspected data and outcome |
| --- | --- |
| `BFS.xlsx` | Both `Sheet1` and `score calculation`. All 15 clinical prompts and coded choices are represented, including question 14 located in `A17`, rather than the usual question column G. Restored options come from `B4:B7` and `B16`; corrected shoe points come from `B14:F14`. The example television question is excluded from scoring. |
| `BFS scoring .docx` | All four rendered pages and four embedded images. The text confirms 15 scored questions, first-four-item code 9 as N/A, and lower-is-better interpretation. Its ranges/formulas are internally inconsistent, as detailed below. |
| `FAAM (1).xlsx` | Both `Sheet1` and `Score Calculation`. All 28 ability prompts and 0–4/X choices are present. Added `A27` and `A36` self-ratings and `C37:G37` global function choices. Header fields come from `G1:G3`. |
| `FAAM scoring (1).docx` | All four rendered pages. Both ADL and sports calculations, N/A adjustments and the four worked examples are verified. The document's illustrative severity categories were not turned into new clinical diagnoses or automatic thresholds. |
| `FAOS (1).xlsx` | Both `Sheet1` and `Score Calculation`. `Sheet1` itself omits question 31; it is present in `Score Calculation!F46` and was restored from there. All 42 prompts and all header fields are represented. Point/label corrections below are recorded as explicit differences from flawed source coding. |
| `FAOS scoring (1).docx` | All four rendered pages and nine embedded images. The reference specifies 42 questions, five separate scores, maxima 28/36/68/20/16, and `100 − raw/max × 100`. Existing answers already contained five options rather than the six in the old screenshot. |

The executable source fixture records the six files' SHA-256 fingerprints, worksheet/cell provenance, prompts and inspected response mappings. FAOS question 39 retains its original workbook choices alongside the corrected expected choices, so the source difference is visible in the fixture. Source documents and workbooks were left unchanged. Instructions embedded in those documents are reference material, not an independent instruction channel.

## Scoring results

### BFS

The workbook's actual coded minima and maxima are **16 and 79**. Its first four real questions range 1–5, its usual-shoe question ranges 2–6, and the remaining item ranges bring the total to 16–79. This agrees with the *individual ranges* printed in the Word document, but not with that same document's claimed 15–73 total.

Applying the printed `(raw − 15) / 58 × 100` to the workbook's maximum gives **110.34**, while the best attainable raw value gives **1.72** instead of zero. The red embedded image/workbook note gives another formula, `raw / maximum × 100`, which also cannot produce zero at the best nonzero raw score. These supplied instructions therefore cannot all be simultaneously valid for the supplied response codes. The original development paper also reports a 15–73 range, so the supplied workbook coding should not be presented as a validated reproduction of the original instrument. [Original BFS development paper](https://www.mdpi.com/1930-8264/95/3/264).

The site's existing normalization method is retained with the restored workbook codes: `(raw − minimum attainable) / (maximum attainable − minimum attainable) × 100`. Without N/A this is `(raw − 16) / 63 × 100`. Code 9 is excluded from raw score and the corresponding attainable minimum/maximum for the first four activities. The result is labelled **الدرجة النسبية المعدّلة**, shows the raw score separately, and explains the source discrepancy and lack of demonstrated equivalence to original BFS. No values are clipped to hide an invalid range.

All 16 combinations of first-four N/A responses are tested at best, worst and intermediate values. The television example has no effect on the calculation. The workbook's shoe-choice wording includes an apparent typo in the four-point new-shoe answer (`عض الصعوبة`), with similar wording at three points. Those source labels are retained and the numeric codes are displayed; the supplied material does not establish a corrected validated Arabic distinction between them.

### FAAM

Only the 21 ADL and seven sports ability questions enter the two subscales. Each uses `sum of numeric answers / (4 × assessed item count) × 100`, with X excluded from numerator and denominator. Higher is better. The four printed examples reproduce exactly:

| Example | Verified result |
| --- | --- |
| ADL raw 63 from 21 assessed items | 63/84 = 75% |
| ADL raw 57 with two N/A responses | 57/76 = 75% |
| Sports raw 14 from seven assessed items | 14/28 = 50% |
| Sports raw 18 with one N/A response | 18/24 = 75% |

An entirely N/A subscale is unavailable, not an assessed zero. An assessable other subscale remains reportable. Both entirely N/A yield no calculated score. The new two self-ratings accept any finite value from 0 to 100, including decimals, and are required by the form; the global classification is also required. Changing them does not change either calculated subscale. Their clinical interpretation is not synthesized from the calculated values.

### FAOS

Five independent scores use `100 − (raw / maximum × 100)`, with maxima **28, 36, 68, 20, 16**. Zero raw burden yields 100, half the maximum yields 50, and maximum burden yields zero. No aggregate total is added. All 42 responses remain required by the application's calculation workflow; this run does not introduce missing-item imputation.

The added toilet question participates in ADL: changing its raw points from zero to four changes only ADL, from 100 to approximately 94.1. Every individual question's effect and every section boundary are tested.

The workbook assigns identical column points to all frequency questions, which would penalize a patient who can *always* straighten or bend the ankle fully. Items 4 and 5 now encode always as zero burden and never as four, following the published FAOS form's reversed answer order. Question 39 asks how often the patient notices the problem; it now uses the appropriate never/monthly/weekly/daily/always frequency choices instead of severity labels. Its Arabic frequency terms are reused from workbook question 8. These are deliberate validity corrections, not additional questions or unrecorded departures from the workbook. [Published FAOS questionnaire, pp. 1 and 5](https://synapse.koreamed.org/upload/synapsedata/extradata/0171kjsm/kjsm-38-20-s001.pdf), [FAOS developer's manual, scoring pp. 3](https://www.koos.nu/FAOSGuide2003_RC.pdf).

## Verification

- **255 questionnaire and in-memory interaction tests pass**, zero failures, skips or todos.
- **Two production-artifact tests pass**, checking all questionnaire files and built HTML assets.
- Repository-wide ESLint, TypeScript project checks and production Vite build pass.
- Full source comparisons cover all 15 BFS, 28 FAAM and 42 FAOS scored prompts, their answer mappings and all added supplementary questions.
- Every foot/ankle form is completed through the real React components. New checks cover affected-side required validation, radio exclusivity, unchanged scores across right/left/both, bounded percentage inputs, qualitative classification, restored options, the BFS explanatory result and FAOS result display.
- The numeric CSV format now supports an optional maximum and `step=any` for these self-ratings; existing integer CPGS day entry behavior is preserved and tested.
- The software checks validate the implemented arithmetic and supplied content. They do not establish psychometric validation of an altered Arabic instrument. Live-browser layout and hosted deployment were not tested because browser access was previously blocked. No deploy, commit or push was performed.
