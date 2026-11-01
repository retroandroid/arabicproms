# Hip questionnaire source audit

Compared both worksheets in all five supplied Excel files, including question order, Arabic prompts, answer labels, numeric codes, context and supplementary fields. Read the five matching Word documents, including their embedded screenshots, tables and rendered pages. Source file SHA-256 fingerprints and cell references are in `tests/fixtures/hip-sources-2026-11-01.json`. Original attachments were not modified.

| Questionnaire | Scored questions | Findings and changes | Scoring comparison |
| --- | ---: | --- | --- |
| HOOS-JR | 6 | All clinical prompts and five choices already matched. Restored the source pain/function instructions, including the past-week timeframe. | Existing sum 0–24 and all 25 conversion-table entries match the Word document and workbook. Both worked examples give raw 9 and converted 61.815. |
| HOOS-12 | 12 | All prompts present. Replaced answer labels on questions 1, 9, 10 and 11 with the workbook's five severity choices, scored 0–4. | Existing three four-item subscores each use raw/16 × 100. Summary is their arithmetic mean. Lower is better, as supplied. |
| HOOS-PS | 5 | All prompts and choices already match. | Existing raw/20 × 100 matches. Word example [1,2,0,3,1] gives 35. Lower is better. |
| iHOT-12 | 12 | All scored prompts and 0–10 choices present. Source header fields retained: date/review period, name and follow-up period. Patient ID was removed at the user's request. Right/left side remains separate from scoring. Made 10 and 0 visible alongside their descriptions, with exactly 11 numeric choices per scored item. | Existing raw/120 × 100 matches. Word example raw 86 gives 71.7/100. Higher is better. Header fields and side do not affect scoring. |
| iHOT-33 | 33 | All clinical prompts present. Restored J48 “none of the above” in Arabic and aligned K48 (not working for other reasons) / L48 (retired). Both skip the four work items. Selecting J restores them. Restored section instructions with the past-month timeframe. Made endpoint numbers visible. | Implements the supplied Word formula exactly: raw/(120 − N/A count) × 100, or raw/(80 − N/A count) × 100 after work skip. Both worked examples pass. Source-derived results above 100 are retained and explained. |

## iHOT-33 scoring conflict

The supplied `IHOT 33 scoring.docx` and workbook `Score Calculation!A64:A67` specify raw/(120 − count of column-A answers) × 100, changing 120 to 80 when K48 or L48 skips work. They also say the result ranges from 0 to 100. With all 33 items worth 10, the literal formula can reach **275**, or **362.5** with four work items skipped. An excluded 0–10 item reduces those printed denominators by only 1.

The site now follows the literal Word formula, as requested. It does not replace the source denominator with the visible maximum or cap results at 100. The result is labelled as calculated using the attached scoring reference, and its formula note explains that the supplied calculation can exceed 100. The raw metric separately shows the numeric sum against the actual attainable maximum of the assessed items; the reference's adjusted denominator appears in its own metric. K/L and hidden work answers never contribute to the raw total or N/A count. This is verification against the supplied calculation, not a claim that its 0–100 range statement is consistent or independently clinically validated.

Word examples verified through both the scorer and the actual form controls:

- Raw 90 with two column-A answers: denominator 118, result 76.3/100.
- K48 or L48 work skip, raw 66 with two other column-A answers: denominator 78, result 84.6/100.
- All maximum responses: 275/100 with J48, or 362.5/100 with K48/L48, displayed without silently changing the source formula.

## Source wording retained

- HOOS-PS `Sheet1!F7` and `Score Calculation!F7` say “your injured knee.” Preserved as supplied instead of replacing it with an invented hip prompt.
- iHOT-33 `M55` and `M59` repeat the same frustration question in both sheets. Both remain present in source order.
- iHOT-33 `Sheet1!B60` drops a letter in “لا قلق على الإطلاق”; the complete wording from `Score Calculation!B60` is retained.
- Truncated iHOT-33 A45/A49 “not performed” labels retain their completed existing wording, consistent with the workbook instructions. J48 is the only translated English response.
- Formatting is normalized for spacing and Arabic presentation glyphs; numeric prefixes in CSV are scoring codes, with no extra unscored “without pain” response.

## Verification

Exact source fixtures cover all 68 scored prompts and every inspected answer mapping. A second independent comparison reopened the 10 original attachments, verified their hashes, and matched 136 clinical question rows and every choice across both worksheets in each of the five workbooks. It also checked all 25 HOOS-JR conversions against the separate first-sheet conversion table and the literal iHOT-33 Word examples.

Scoring checks cover every HOOS-JR conversion, HOOS-12 domain membership and mean, all HOOS-PS raw totals, the iHOT-12 worked example and per-item weight, every iHOT-33 numeric item's contribution, and all 16 iHOT-33 N/A combinations under J, K and L. In-memory UI checks cover source metadata, visible endpoint values, single-choice groups, work skip/reversal, the Word worked examples, above-100 results with their explanation, and submission. The complete application tests, lint, type checks, production build and copied production questionnaire checks are run after these changes. A live browser or deployed site is not verified by these checks.

Final results: **274 application/source/interaction tests passed**, with no failures, skipped tests or todos. **Two production-artifact tests passed**, including all 23 questionnaire files copied byte-for-byte. ESLint, TypeScript and the production build also passed. Worked examples are tested through the actual form controls for all five hip instruments.
