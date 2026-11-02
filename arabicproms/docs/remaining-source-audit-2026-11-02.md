# Remaining questionnaire source check

Checked all seven supplied workbooks and their matching Word scoring documents. The Word documents were read as text, tables and embedded images, with all 17 rendered pages inspected. The original 14 attachments are unchanged. Source cell references, inspected answer mappings, scoring cases and attachment hashes are recorded in `tests/fixtures/remaining-sources-2026-11-02.json`.

| Questionnaire | Question coverage | Result |
| --- | --- | --- |
| QBS | All 20 questions and six 0–5 choices were already present. | Existing score correctly sums the answers, reported directly out of 100. Every attainable raw total is tested. |
| LLTQ | All 20 activities, each with ability and importance responses, were present. Restored the source name/date-of-birth fields and 24-hour instructions. | Only the 20 ability responses enter the two separate scores: 10 items per section, raw/40 × 100. Ability is recognized from the source's 0–4 response scale rather than an app-added prompt suffix. Importance answers do not affect results. Word example ADL 75 and sports 50 passes. |
| Edinburgh | All six questions were present. The Word document clarifies the workbook's shortened relief and location labels. | Q1 No now stops the form and immediately returns negative. Positive requires Q1 Yes, Q2 No, Q3 Yes, relief within ten minutes and an eligible location. Calf takes precedence; thigh/buttock without calf is atypical. Q4 determines grade 1 or 2 only for a positive result. |
| KOOS-12 | All 12 questions and five correctly coded choices were present. Restored the source name, date of birth, gender and dominant-leg fields. | The existing three raw/16 × 100 subscores and raw/48 × 100 total match the Word reference. Lower is better as specified. |
| KOOS-JR | All seven questions and five 0–4 choices were present. Restored the source name/date/affected-knee fields, sections and past-week instructions. Aligned the stairs prompt with the workbook wording. | All 29 conversion values match both source tables and the Word screenshot. Raw 9 converts to 63.776; endpoints are raw 0 → 100 and raw 28 → 0. |
| MHQ | All 62 scored questions were present. Restored the missing final background/return-to-work questions and their choices, including the source's other-background blank. Source header fields were restored, with handedness collected once. | Removed undocumented appearance/satisfaction reversals. All five subscores use the selected source codes and the Word table's (raw − 5)/denominator × 100 formula. Implemented the source pain-follow-up skips in the form and corrected the one-hand raw sum. See the source inconsistencies below. |
| DHI | All 18 questions and exactly six correctly ordered 0–5 options were present. Restored the source patient fields. | The Word document explicitly requires the raw sum out of 90. Its worked example gives 17/90. The workbook's generic percentage note does not override this explicit rule. |

Patient ID and medical-record-number fields remain removed, following the user's explicit instructions. Source header and background information stays outside scoring. The MHQ background questions are optional and follow the scored sections, so someone without a postoperative return-to-work history can still complete the scored questionnaire.

## MHQ scoring details and source inconsistencies

The Word table and workbook both explicitly prescribe denominators 130, 20, 50, 35 and 55 with a fixed subtraction of 5. These literal formulas take precedence over the document's generic prose about subtracting a section minimum. The source does not specify item reversals, so the selected 1–5 codes are summed directly. No new overall MHQ score is added.

The pain-frequency questions are worksheet I50 and I59, corresponding to clinical questions 33 and 38. Selecting 5 (never) skips that hand's four follow-ups. Both answered frequency items remain in the raw sum. The denominator is 50 for neither never, 20 for one never, or 5 for both never. Hidden stale follow-up answers are ignored. With both frequency responses equal to 5, raw 10 produces 100. With one never and remaining pain responses [4,5,5,5,5], raw 29 produces 120; it is displayed without silently changing the supplied formula.

The Word document says both that lower pain scores are better and that subscores 2–5, including pain, are better when higher. These statements conflict. The result explicitly identifies that conflict rather than asserting either pain direction as verified. The other subscore directions remain as supplied. This audit verifies source implementation and arithmetic, not independent clinical validity of the inconsistent pain conventions.

## Source layout details

- LLTQ duplicates the cart activity's ability row at 18 and 20; the importance row 21 has a blank prompt. The activity is retained once, with the row-21 importance response paired with row 20. The Word reference explicitly requires ten activities per section, not an extra duplicate scored activity.
- LLTQ's second worksheet heading repeats “daily living,” while the Word document and the running/jumping tasks identify that section as sports/higher-level activities. The existing sports heading is retained.
- MHQ header G6 and final question I94 request the same handedness information. One source-backed field covers both; no duplicate question is added. The remaining final questions I95:I103 are restored, including repeated return-to-work prompts as supplied. The other-background blank comes from C96.
- MHQ's scale-header text contains misplaced embedded digits. The unambiguous numeric response cells and the Word 1–5 scales determine the mappings. The appearance and satisfaction mappings are not reversed to reconcile the source's interpretation statements.
- The KOOS worksheet footnotes contain point-label typos. Question-cell codes, the Word 0–4 response table, and the conversion tables determine scoring.
- Arabic presentation glyphs, Persian/Arabic yeh/heh variants, spacing, diacritics and terminal display ordinals are normalized for text comparisons. KOOS-JR's “شديد جدًا” spelling follows the Word response table.
- Edinburgh's extra negative-location labels are all named in the Word exclusion rule. Generic “الساق” matching is avoided so shin pain cannot be mistaken for calf pain. The calf choice does not exclude simultaneous thigh/buttock pain.

## Verification

An independent reread of the original attachments verifies all hashes, 306 clinical question-row comparisons across the worksheets (including two inherited LLTQ importance prompts), the source response codes, and agreement between both KOOS-JR conversion tables. The seven questionnaires contain 165 clinical/importance response prompts, all matched against inspected source fixtures.

Automated checks cover all attainable QBS and DHI raw sums, every KOOS-JR conversion, independent KOOS-12 domain calculations, LLTQ ability/importance separation, every MHQ item's contribution, all four MHQ pain branches with stale hidden responses, and all 288 Edinburgh response combinations. Real component interactions reproduce reference scores for all seven forms, test both skip flows, source metadata, optional background information and the conditional other-background entry.

The checks use local source fixtures and an in-memory DOM. A live browser or deployed copy is not verified by these tests.

Final results: **301 application/source/interaction tests and two production-artifact tests passed**, with no failures, skipped tests or todos. ESLint, TypeScript, the production build and whitespace checks also passed. All 23 questionnaire CSVs match their production copies byte-for-byte.
