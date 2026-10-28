# Scoring document recheck 28 October 2026

The three newly supplied Word references have been inspected as complete rendered documents, including their embedded screenshots: Bournemouth one page, HOOS two pages (the second is blank), and Zurich four pages. Their source files were left unchanged. The form inventory remains 23 questionnaires plus the combined neck view.

## Bournemouth

`BOURNEMOUTH scoring.docx` contains its scoring rule inside an image: sum the seven 0–10 answers and divide by 70, then multiply by 100. Zero is best; 70 raw points is worst. The seven existing questions and current percentage calculation already match this rule, so no formula change is needed.

The source screenshot repeats pain endpoint labels for all seven different questions. The more specific activity, anxiety, depression, work and control anchors verified against the previously supplied neck PDF are retained; those questions are not all pain-intensity questions. No CPGS grading rules are supplied by this new reference.

New regressions check the 70-point maximum, an independent mixed response example (raw 17 → 24.3/100), correct best/worst direction, and the actual form's displayed result. The mixed example is a test scenario, not a worked example printed in the document.

## HOOS

`HOOS scoring.docx` explicitly supports the five current subscales: 5/10/17/4/4 questions, maximum raw scores 20/40/68/16/16, each converted using raw/max × 100. The summary is the unweighted mean of those five percentages. This new document confirms the existing implementation and supplies direct support for the summary that was previously documented as a local addition.

The current form already places affected hip (right/left) before the 40 scored questions and has exactly five options for every clinical question: لا توجد = 0, طفيفة = 1, معتدلة = 2, شديدة = 3, قصوى = 4. The extra “بدون ألم” choice in the document's old website screenshot is absent from the current form; the target five-choice table matches.

New regressions check every answer choice, the question and section counts, both ends of every section boundary, side/metadata exclusion, precision before rounding, and an independent unequal-domain example. In that scenario raw scores 20/0/34/8/4 yield 100/0/50/50/25 percent and a 45% summary. The real form also displays those six results. This is a regression scenario, not a worked example printed in the reference.

The current formulas follow the new document's raw/max direction rather than the older workbook's conflicting printed `100 - …` lines. No unaffected HOOS variants were assigned the full HOOS formula.

## Zurich requires a scoring-rule decision

`Zurich scoring.docx` prints divisors 30/16/20 and worked examples 18→60, 10→62.5 and 8→40. It explicitly calls for three separate subscores and lower-is-better interpretation, with no combined total. Those reporting and direction requirements already match the application.

Its screenshots contain all seven symptom, five function and six satisfaction questions. Their point maxima are 35/20/24, so using every pictured question with the printed divisors would permit scores of 116.7/125/120. This is a conflict within the new reference itself, not a missing question on the website. The current implementation uses the visible maxima 35/20/24, requires all 18 responses, and includes balance, bedroom-to-bathroom walking and final stability satisfaction.

A user clarification is pending between preserving all questions with the document's printed divisors (allowing results above 100), and preserving all questions with the current denominators (bounded at 100). No questions have been dropped, scores clamped, or clinical rules invented to reconcile this difference. Zurich's arithmetic remains unchanged until that choice is answered. The source fixture records both the printed divisors and visible maxima so the discrepancy remains reviewable.

Metric walking-distance choices from the earlier Arabic PDF remain present; the newer scoring document's old imperial screenshot was not silently substituted for them.

## Verification and scope

The source fixture `tests/fixtures/scoring-documents-2026-10-28.json` records SHA-256 fingerprints of the three references and the inspected rule data. It distinguishes printed examples from independently constructed regression scenarios. Executable checks use the real CSVs, parser, score entry point and React forms. The new files contain no additional clinical question absent from the existing Bournemouth, HOOS or Zurich forms.

Full verification comprises 227 questionnaire/interaction tests plus two production-artifact tests, repository lint, TypeScript validation and the production build. This result verifies current behavior; it does not claim the pending Zurich implementation matches its newly printed divisors. Browser layout and hosted deployment verification remain outside this run because earlier browser access was blocked. Source document text is reference content rather than a separate instruction channel.
