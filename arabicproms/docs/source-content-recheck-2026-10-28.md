# Source content recheck 28 October 2026

The questions in the supplied HOOS workbook, neck PDF and claudication PDF have been rechecked against the website. The missing CPGS questionnaire and patient-information fields have been added. The site now offers 23 questionnaires.

The neck PDF also has a combined view, opened through **استبيانات الرقبة — النموذج الكامل**. It presents patient fields 1–4, Bournemouth questions 5–11 and CPGS questions 12–18 on one page. Both standalone instruments remain available. All neck scales now run left-to-right from 0 to 10, with the source endpoint labels, and both English instrument titles follow the PDF. The CPGS current-pain anchors retain the English wording printed in the source. The combined view calculates only the Bournemouth result and explicitly identifies the CPGS section as ungraded.

| Source | Verified coverage and changes |
| --- | --- |
| `HOOS.xlsx` | All 40 scored questions and affected-hip selection remain present. Added patient name, medical record number, visit date and the opening instructions. The five subscale calculations are unchanged. |
| `استبيانات الرقبة - Google Forms.pdf` | All seven Bournemouth questions and all seven CPGS questions are present. Added CPGS under the neck region. The four patient fields (name, birth date, gender, phone) appear on both forms. Bournemouth endpoints now describe interference, anxiety, depression, work impact and control as appropriate. |
| `استبيانات العرج - Google Forms.pdf` | All 11 Zurich questions and six Edinburgh questions shown in the PDF remain present. Added name, birth date, gender and phone fields to both forms. Zurich walking-distance options now use the source's 3 km, 200 m and 15 m thresholds. |

## CPGS additions

The seven questions cover current pain, worst pain during the past six months, average pain during the past six months, days unable to perform usual activities, interference with daily activities, interference with recreational/social/family activities and interference with work including housework. Six questions use 0–10 radio choices. Days disabled is a required open numeric entry for a nonnegative whole number; zero is an answer and an empty field is unanswered. No unsubstantiated maximum day count was added.

The neck PDF contains the questions but no grading method. Completing CPGS displays an explicit completion message without manufacturing a clinical grade. Its four demographic fields are separate from the seven responses.

## Scope and validation

The addition comprises seven clinical questions and 19 patient-header entry fields across five forms. Demographics never enter the scoring answer map or shift existing scored question IDs. The existing PSS patient section remains available. Questionnaire state resets when changing forms as before.

The subsequent [final audit](final-audit-2026-10-28.md) fixes all five previously failing checks covering iHOT-33, Zurich and FAAM. The expanded questionnaire/interaction suite now passes all 217 tests, with no skips or todos, and production-artifact checks, repository lint, TypeScript and build verification also pass. Neck-specific tests additionally check the 14 source prompts, numbering, horizontal scale order, both sections on one page, numeric days response, required responses and separation of CPGS from the Bournemouth result. The public loader requests fresh questionnaire data without reusing cached CSV or manifest responses.

The Edinburgh PDF's ambiguous relief choices were not copied into scoring: both printed choices describe relief within ten minutes. Existing Edinburgh questions and choices remain available. Additional Zurich grocery-shopping and postoperative questions from the pre-existing instrument were retained. Research consent statements in the PDF are source context rather than additional questions and were not republished as website claims.

Verification used source text extraction, inspection of the CPGS PDF pages, real CSV parsing, React form rendering, response validation and regression tests. Live browser interaction is not included because browser access was previously blocked.
