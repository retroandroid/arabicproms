# Local Excel Scoring Reference

This note is based only on the Excel files currently provided locally. No outside sources are used here.

Purpose:
- identify which questionnaires already include scoring logic in the provided Excel workbooks
- record the workbook-stated formulas and special handling
- flag questionnaires that still need source Excel scoring details before implementation

## Ready From Local Excel

### `AOS`
- Source:
  - scoring provided from the user screenshot in chat
- Scored outputs:
  - `pain_subscore`
  - `difficulty_subscore`
  - `total_score`
- Workbook/image formula:
  - Pain block: `(sum / 90) * 100`
  - Difficulty block: `(sum / 90) * 100`
- Direction:
  - higher score = better condition
- Notes:
  - The screenshot shows two 9-question blocks with 0 to 10 answers.
  - The app computes the total score as the average of the two 0 to 100 subscores, which is equivalent to normalizing the combined 18-question raw total.

### `BFS`
- Workbook:
  - `BFS.xlsx`
  - confirmed by the user screenshot in chat
- Scored outputs:
  - `total_score`
- Workbook/image formula:
  - `score = (raw score / maximum possible) * 100`
- Direction:
  - `0 = best condition`
  - `100 = worst condition`
- Special handling:
  - question 1 is excluded from scoring
- Notes:
  - The visible point labels in the workbook do not start at zero for the best response on every item, while the same sheet also says `0 = best`.
  - In the app implementation, the score is normalized to a 0 to 100 scale after excluding question 1 so the displayed result matches the workbook’s stated interpretation.

### `Bournemouth Neck`
- Source:
  - scoring provided from the user screenshot in chat
- Scored outputs:
  - `total_score`
- Workbook/image formula:
  - `score = (raw score / total) * 100`
- Direction:
  - `0/70 = best condition`
  - `70/70 = worst condition`
- Notes:
  - The current CSV contains `7` questions with `0` to `10` responses, so the raw total range is `0-70`.
  - The app reports both the normalized 0 to 100 score and the raw total.

### `DHI`
- Source:
  - scoring provided from the user screenshot in chat
- Scored outputs:
  - `total_score`
- Workbook/image formula:
  - `score = (raw score / total) * 100`
- Direction:
  - lower score = better condition
  - higher score = worse condition
- Notes:
  - The current CSV contains `18` questions with `0` to `5` responses, so the raw total range is `0-90`.
  - The app reports both the normalized 0 to 100 score and the raw total.

### `Edinburgh`
- Source:
  - scoring provided from the user screenshot in chat
- Scored outputs:
  - `interpretation`
  - `grade`
- Workbook/image rule:
  - if criteria are met, interpretation is `Definite Claudication`
  - if the same criteria are met except that pain is in the thigh or buttock rather than the calf, interpretation is `Atypical Claudication`
  - otherwise interpretation is `No Claudication`
- Direction:
  - this is a categorical interpretation, not a summed numeric score
- Notes:
  - In the current CSV, question 4 is used only to derive grade:
  - `No` on level-ground walking pain => `Grade 1`
  - `Yes` on level-ground walking pain => `Grade 2`
  - The app checks the location answer by its text label and treats any answer containing `الساق` as calf pain.

### `PSS`
- Workbook:
  - `PSS.xlsx`
- Scored outputs:
  - `pain_score`
  - `satisfaction_score`
  - `function_score`
  - `total_score`
- Workbook formula:
  - pain score: first `3` questions, out of `30`
  - satisfaction score: question `4`, out of `10`
  - function score: first compute denominator `60 - (number of X × 3)`, then calculate `[sum of answers / adjusted denominator] × 60`
  - total PSS: the workbook note says pain + satisfaction + function, out of `100`
- Notes:
  - Question `5` is not part of the total score.
  - The workbook does not explicitly state how the pain subtotal should be aligned with the positive satisfaction/function subscores in the final total.
  - In the app implementation, the total uses an inverted pain contribution `30 - raw pain` so the final `total_score` remains a coherent 0 to 100 score with higher = better.

### `HOOS`
- Workbook:
  - `HOOS.xlsx`
- Scored outputs:
  - `symptoms`
  - `pain`
  - `adl_function`
  - `sport_recreation`
  - `quality_of_life`
- Workbook formula:
  - Symptoms: `(raw / 20) * 100`
  - Pain: `(raw / 40) * 100`
  - ADL function: `(raw / 68) * 100`
  - Sport/recreation: `(raw / 16) * 100`
  - Quality of life: `(raw / 16) * 100`
- Direction:
  - lower score = better condition
- Notes:
  - The current CSV has `40` questions and the visible ADL block contains `17` scored items, so the `68` denominator in the score sheet is consistent.
  - The same score sheet also contains decorative `100 - ...` print lines, but its explicit formula cells and final direction note align on lower = better, so the app follows the explicit formulas.

### `FAAM`
- Workbook: `FAAM.xlsx`
- Scored outputs:
  - `adl_score`
  - `sports_score`
- Workbook formula:
  - ADL: `(sum answered item values) / (4 * answered_items)` then transform to `%`
  - Sports: `(sum answered item values) / (4 * answered_items)` then transform to `%`
- Special handling:
  - `X` means non-applicable and is excluded from the denominator.
  - ADL max answered items: `21`
  - Sports max answered items: `7`
- Direction:
  - higher is better
- Notes:
  - The workbook also contains two separate 0 to 100 self-rating questions and one current-function question. Those are standalone values, not part of the two computed scores.

### `FAOS`
- Workbook: `FAOS.xlsx`
- Scored outputs:
  - `symptoms`
  - `pain`
  - `adl_function`
  - `sports_function`
  - `quality_of_life`
- Workbook formula:
  - Symptoms: `(raw / 28) * 100`
  - Pain: `(raw / 36) * 100`
  - ADL function: score sheet text says `(raw / 68) * 100`
  - Sports function: `(raw / 20) * 100`
  - Quality of life: `(raw / 16) * 100`
- Point mapping from the workbook scoring sheet:
  - first option column = `4`
  - second = `3`
  - third = `2`
  - fourth = `1`
  - fifth = `0`
- Direction:
  - the workbook text says higher subscore = better condition
- Notes:
  - The workbook contains an internal inconsistency:
  - the visible questionnaire blocks contain `16` ADL questions, which implies a denominator of `64`, not `68`
  - the score sheet also says higher is better even though the visible point mapping is `4 = worst` and `0 = none`
  - In the app implementation, FAOS is enabled using the visible `41` questionnaire items and a `64` denominator for the ADL block. The result is currently treated as a lower-is-better burden score because that is the only interpretation that matches the displayed points without inventing an extra inversion step.

### `HOOS`
- Workbook: `HOOS.xlsx`
- Scored outputs:
  - `symptoms`
  - `pain`
  - `adl_function`
  - `sport_recreation`
  - `quality_of_life`
- Workbook formula text on the score sheet:
  - Symptoms: `(raw / 20) * 100`
  - Pain: `(raw / 40) * 100`
  - ADL function: `(raw / 68) * 100`
  - Sport/recreation: `(raw / 16) * 100`
  - Quality of life: `(raw / 16) * 100`
- Additional note on the questionnaire sheet:
  - subscale display lines are written as `100 - ...`
- Direction:
  - workbook indicates lower raw score = better condition
- Implementation note:
  - There is a workbook inconsistency between the score sheet and the printed `100 - ...` lines. This is locally documented enough to implement, but we should test one sample by hand before finalizing.

### `HOOS-12`
- Workbook: `HOOS-12.xlsx`
- Scored outputs:
  - `pain`
  - `adl_function`
  - `quality_of_life`
- Workbook formula:
  - each subscore: `(raw / 16) * 100`
- Point mapping:
  - option columns map to `0,1,2,3,4`
- Direction:
  - lower score = better condition
- Notes:
  - The current CSV order matches the score sheet exactly as three blocks of four questions each: pain, ADL, and quality of life.

### `HOOS-JR`
- Workbook: `HOOS-JR.xlsx`
- Scored outputs:
  - `raw_score`
  - `converted_score`
- Workbook rule:
  - raw responses are summed to a `0-24` raw score
  - raw score is converted using the workbook table below
- Workbook direction:
  - `0 = complete hip disability`

### `MHQ`
- Workbook:
  - `MHQ.xlsx`
- Scored outputs:
  - `hand_function`
  - `work_performance`
  - `pain`
  - `appearance`
  - `satisfaction`
- Workbook formula text on the `Score Calculation` sheet:
  - `subscore 1`: `((raw score (sum of the answers) - 5) / 130) x 100`
  - `subscore 2`: `((raw score (sum of the answers) - 5) / 20) x 100`
  - `subscore 3`: `((raw score (sum of the answers) - 5) / 50) x 100`
  - if the first pain item of one hand is `Never`, the sheet switches `subscore 3` to `/20`
  - if both first pain items are `Never`, the sheet switches `subscore 3` to `/5`
  - `subscore 4`: `((raw score (sum of the answers) - 5) / 35) x 100`
  - `subscore 5`: `((raw score (sum of the answers) - 5) / 55) x 100`
- Workbook direction:
  - `subscore 1`: lower = better
  - `subscores 2-5`: higher = better
- Notes:
  - The score sheet groups the questionnaire cleanly by row blocks, so the app follows those row blocks directly.
  - The written formulas are internally uneven versus the visible item counts, so the implementation keeps the sheet formulas as written rather than inventing outside corrections.
  - To keep `subscores 2-5` aligned with the sheet’s stated direction, only the clearly opposite-worded items are reverse-coded locally:
  - pain severity items
  - the two positive appearance items
  - all satisfaction items
  - `100 = perfect hip health`
- Conversion table:

| Raw | Converted |
| --- | --- |
| 0 | 100 |
| 1 | 92.340 |
| 2 | 85.257 |
| 3 | 80.550 |
| 4 | 76.776 |
| 5 | 73.472 |
| 6 | 70.426 |
| 7 | 67.516 |
| 8 | 64.664 |
| 9 | 61.815 |
| 10 | 58.930 |
| 11 | 55.985 |
| 12 | 52.965 |
| 13 | 49.858 |
| 14 | 46.652 |
| 15 | 43.335 |
| 16 | 39.902 |
| 17 | 36.363 |
| 18 | 32.735 |
| 19 | 29.009 |
| 20 | 25.103 |
| 21 | 20.805 |
| 22 | 15.633 |
| 23 | 8.104 |
| 24 | 0 |

### `HOOS-PS`
- Workbook: `HOOS-PS.xlsx`
- Scored outputs:
  - `physical_function_shortform`
- Workbook formula:
  - `(raw / 20) * 100`
- Point mapping:
  - option columns map to `0,1,2,3,4`
- Direction:
  - lower score = better condition

### `KOOS-12`
- Workbook: `KOOS-12.xlsx`
- Scored outputs:
  - `pain`
  - `function`
  - `quality_of_life`
  - `total`
- Workbook formula:
  - Pain: `(raw / 16) * 100`
  - Function: `(raw / 16) * 100`
  - Quality of life: `(raw / 16) * 100`
  - Total: `(raw / 48) * 100`
- Point mapping:
  - option columns map to `4,3,2,1,0`
- Direction:
  - lower score = better condition
- Notes:
  - The current CSV order matches the score sheet as three 4-question blocks: pain, function, and quality of life.

### `KOOS-JR`
- Workbook: `KOOS-JR.xlsx`
- Scored outputs:
  - `raw_score`
  - `converted_score`
- Workbook rule:
  - raw responses are summed to a `0-28` raw score
  - raw score is converted using the workbook table below
- Workbook direction:
  - `0 = complete knee disability`
  - `100 = perfect knee health`
- Conversion table:

| Raw | Converted |
| --- | --- |
| 0 | 100 |
| 1 | 91.975 |
| 2 | 84.600 |
| 3 | 79.914 |
| 4 | 76.332 |
| 5 | 73.342 |
| 6 | 70.704 |
| 7 | 68.284 |
| 8 | 65.994 |
| 9 | 63.776 |
| 10 | 61.583 |
| 11 | 59.381 |
| 12 | 57.140 |
| 13 | 54.840 |
| 14 | 52.465 |
| 15 | 50.012 |
| 16 | 47.487 |
| 17 | 44.905 |
| 18 | 42.281 |
| 19 | 39.625 |
| 20 | 36.931 |
| 21 | 34.174 |
| 22 | 31.307 |
| 23 | 28.251 |
| 24 | 24.875 |
| 25 | 20.941 |
| 26 | 15.939 |
| 27 | 8.291 |
| 28 | 0 |

### `LLTQ`
- Workbook: `LLTQ.xlsx`
- Scored outputs:
  - `adl_subscore`
  - `sport_subscore`
- Workbook formula:
  - first subscore: `(raw / 40)`
  - second subscore: `(raw / 40)`
- Important workbook note:
  - only the blue columns count toward scoring
- Implementation note:
  - In our CSV conversion each task was split into two rows: `- القدرة` and `- الأهمية`.
  - The workbook note strongly suggests the score should be calculated from only one of those two row types. Based on the local sheet, the intended scored rows are the ability rows, not the importance rows.

### `MHQ`
- Workbook: `MHQ.xlsx`
- Scored outputs from the local scoring sheet:
  - `hand_function`
  - `work_performance`
  - `pain`
  - `appearance`
  - `satisfaction`
- Workbook formulas:
  - Hand function: `((raw - 5) / 130) * 100`
  - Work performance: `((raw - 5) / 20) * 100`
  - Pain: `((raw - 5) / 50) * 100`
  - Appearance: `((raw - 5) / 35) * 100`
  - Satisfaction: `((raw - 5) / 55) * 100`
- Pain special handling from the workbook:
  - if either first pain-frequency item for right or left hand is the skip answer, pain formula becomes `((raw - 5) / 20) * 100`
  - if both first pain-frequency items are the skip answer, pain formula becomes `((raw - 5) / 5) * 100`
- Direction:
  - workbook says subscore 1: lower = better
  - workbook says subscores 2-5: higher = better
- Implementation note:
  - MHQ is the most complex instrument in the set.
  - Before coding results we should map each CSV row to the workbook subscore buckets explicitly and exclude the final demographic section from scoring.

### `QBS`
- Workbook: `QBS.xlsx`
- Scored outputs:
  - `total_score`
- Workbook rule:
  - `sum all item scores`
  - score sheet notes: `اجمع الأرقام للحصول على المجموع الكلي`
  - separate line: `score calculation: (raw score (sum of the answers)) / 100`
- Direction:
  - lower score = better condition
- Implementation note:
  - Since the raw total already ranges from `0` to `100`, using the raw total and the normalized `raw / 100` are numerically equivalent up to scaling.

### `SFI-10`
- Workbook: `SFI-10.xlsx`
- Scored outputs:
  - `sfi_part_1_percent`
  - `nrs_part_2`
- Workbook formula:
  - point mapping on the score sheet:
    - `نعم = 2`
    - `جزئيًا = 1`
    - `لا = 0`
  - printed formula line on the score sheet: `(raw / 50) * 100`
- Direction:
  - lower score = better condition
- Implementation note:
  - The 10 yes/partly/no items are the scored part.
  - The NRS question is present as a separate numeric rating.
  - The visible score sheet is internally inconsistent because `10` items scored with `2/1/0` produce a raw maximum of `20`, not `50`.
  - In the app implementation, part 1 is normalized from the visible 10-item block as `(raw / 20) * 100`, while the NRS remains a separate `0-10` value.

### `SFI`
- Workbook: `SFI.xlsx`
- Scored outputs:
  - `sfi_percent`
- Workbook formula text:
  - point mapping on the score sheet:
    - `نعم = 2`
    - `جزئيًا = 1`
    - `لا = 0`
  - `(raw / 50) * 100`
- Direction:
  - lower score = better condition
- Implementation note:
  - The current CSV stores plain `نعم / جزئيًا / لا` labels without numeric prefixes, so the app scorer maps them explicitly from the selected label instead of relying on parser fallback values.

### `Zurich`
- Workbook: `Zurich.xlsx`
- Scored outputs:
  - `symptom_subscore`
  - `function_subscore`
  - `satisfaction_subscore`
- Workbook formula:
  - Symptoms: `(raw / 30) * 100`
  - Function: `(raw / 16) * 100`
  - Satisfaction: `(raw / 20) * 100`
- Direction:
  - lower score = better condition
- Implementation note:
  - The score sheet is internally inconsistent with the visible questionnaire rows in the same workbook.
  - The visible blocks contain:
    - `7` symptom questions
    - `5` function questions
    - `6` satisfaction questions
  - Using the written denominators `30 / 16 / 20` with those visible item blocks can produce values above `100`.
  - In the app implementation, each Zurich subscore is therefore normalized against the visible maximum of its current CSV block so results stay bounded and match the shown questionnaire structure.

### `iHOT-12`
- Workbook: `iHOT-12.xlsx`
- Scored outputs:
  - `total_score`
- Workbook formula:
  - `(raw / 120) * 100`
- Direction:
  - higher score = better condition

### `iHOT-33`
- Workbook: `iHOT-33.xlsx`
- Scored outputs:
  - `total_score`
- Workbook formula:
  - `(raw / (120 - count_of_column_A_answers)) * 100`
- Special handling:
  - items answered from the special leftmost non-applicable column reduce the denominator
  - if the work-section skip option is selected, section III is skipped and the denominator becomes `80 - count_of_column_A_answers`
- Direction:
  - higher score = better condition
- Implementation note:
  - The workbook’s printed denominator `120` does not match the visible `33` scored questions on a `0-10` scale.
  - The same sheet is still clear about two rules that do align with the visible questionnaire:
    - `X` removes that item from the denominator
    - skipping section III removes the 4 work questions from the denominator
  - In the app implementation, the result is therefore normalized by the visible maximum of the currently scored questions:
    - full questionnaire: denominator starts from the visible question maxima
    - each `X` answer removes that question’s `10` points from the denominator
    - if the 4 work questions are all left unanswered, section III is treated as skipped

## Not Ready From Local Excel

These questionnaires currently do not have scoring instructions available in the local Excel set I have, or the source workbook itself is not present locally:

- `AOS`
  - questionnaire CSV exists
  - no scoring workbook details available locally
- `BFS`
  - questionnaire CSV exists
  - no scoring workbook details available locally
- `Bournemouth Neck`
  - questionnaire CSV exists
  - no scoring workbook details available locally
- `DHI`
  - questionnaire CSV exists
  - no scoring workbook details available locally
- `Edinburgh`
  - questionnaire CSV exists
  - no scoring workbook details available locally
- `PSS`
  - workbook is present locally, but it does not include a local scoring sheet or explicit formula

## Implementation Readiness

Safe to implement directly from local Excel:
- `AOS`
- `BFS`
- `Bournemouth Neck`
- `DHI`
- `Edinburgh`
- `FAAM`
- `FAOS`
- `HOOS`
- `HOOS-12`
- `KOOS-12`
- `PSS`
- `HOOS-JR`
- `HOOS-PS`
- `KOOS-JR`
- `LLTQ`
- `MHQ` with explicit row-to-domain mapping
- `QBS`
- `SFI-10`
- `SFI`
- `Zurich`
- `iHOT-12`
- `iHOT-33`

Implement with one extra workbook sanity check first:

Blocked until local source scoring details exist:
