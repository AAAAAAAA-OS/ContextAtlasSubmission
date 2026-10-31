# Prompts and message structure

The release keeps English instructions separate from study data. Each model request contains a system message describing the role and response contract, followed by a JSON user payload. The exact messages are saved in the run's call ledger.

The active files are in [`prompts/matched/`](../prompts/matched/): `planner.txt`, `reviewer.txt`, `baseline.txt`, `decision.txt`, `eligibility.txt` and `coverage.txt`. The codebook supplies search-time attribute and concept definitions. The instructions use ordinary research language with explicit output contracts.

`npm run export-prompts` exports these instructions and example payloads for inspection. Optional paper extraction uses a separate prompt to draft a study specification and identify unresolved facts for researcher review.

## Planning

The planner proposes four informative contextual comparisons. It receives the fixed relationship, common facts, search-time definitions and private history. Each proposal distinguishes the observable condition changed, conditions held fixed, a possible mechanism, a rival account, an empirical test and an anticipated direction.

Mechanisms and anticipated directions remain private to planning. They are not copied into factual settings. The planner should not prescribe participants' preferences or build the desired effect into an eligibility rule. It can revisit an attribute when a different contrast asks a substantively new question.

## Review and selection

The review prompt checks comparability, feasibility, grounded attribute coding and distinctiveness. It requests a 0–2 prospective relationship-change rating and a short reason. The reviewer evaluates designs before seeing assessments; the coordinator selects from these judgments and coverage gains.

The next planner receives the updated memory. Reflection is part of this next planning task, not a separate agent that modifies recorded scores.

## Relationship assessment

The decision system prompt preserves the calibrated instruction: judge the stated organizational relationship using the supplied facts, keep the outcome and comparator consistent, and consider what an arrangement can do as well as what is required to operate it. A need for coordination or protection alone does not establish the capacity to supply it.

The user payload has this form:

```json
{
  "background": "The fixed task, definitions, X contrast and common facts.",
  "contexts": [
    {"context_id": "opaque-id-1", "narrative": "First factual setting."},
    {"context_id": "opaque-id-2", "narrative": "Second factual setting."}
  ]
}
```

The response contains `ratings`, with a `context_id`, `score` and brief `explanation` for each setting, plus a `limitations` string. Scores range from −100 to +100; `null` indicates insufficient information. The prompt requests brief reported considerations and a final score, not private reasoning.

The coordinator reverses setting and fact order for the second fresh assessment and decodes opaque IDs before computing changes. Neither assessment receives the planner's expected result, mechanism, earlier scores or method label.

## Direct generation

The baseline asks for the allocated number of plausible comparisons in one pass. Each has a title, held facts and one changed attribute with two concrete levels. It does not request rankings, expected directions, search-time codes or an adaptive plan. The same fixed X–Y definition and factual comparability requirements apply.

## Common evaluation

Two fresh eligibility judgments inspect the factual comparisons in opposite orders; both must admit a pair. The coverage prompt then builds a shared vocabulary in one call. It merges synonyms and alternative levels of the same variable, keeps different observable variables separate, and assigns one primary conceptual category per attribute. Justified additional categories are allowed and retained by name.

Coverage inputs hide method labels, scores, titles, proposed attribute names and prior codes. Aggregate coverage is computed from returned codes, not requested as an impressionistic quality rating.

## Changing prompts

Run offline tests after editing instructions or contracts, and start a new run directory. A prompt change creates a new measurement or search configuration; it must not silently change an interrupted study or archived result. Example inputs and the offline demo illustrate the interface. They do not replace the exact request ledger of a research run.
