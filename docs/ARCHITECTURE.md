# Architecture

ContextAtlas separates research planning from relationship assessment. Planning uses the accumulated experiment record; decision agents receive only the fixed task and factual settings. A deterministic coordinator validates responses, selects comparisons, computes metrics and saves the record.

## Research specification

The input defines X, its lower-to-higher contrast, Y, the unit, the time horizon, the setting and common facts. These definitions remain fixed throughout a run. A researcher can derive them from a paper or supply a question directly. Review them before search begins: changing the meaning of Y midway would make the comparisons difficult to interpret.

The specification describes facts, not a preferred result. Source findings can inform the research question without being supplied to the decision agent as an answer to reproduce.

## A search round

1. **Propose four comparisons.** The planner sees the specification and private memory. Each candidate contains a factual reference–changed pair, one changed attribute, held conditions, a proposed mechanism, a rival account and a possible empirical test.
2. **Review the designs.** The reviewer checks that the pair changes one clear dimension, preserves the constructs and common facts, grounds its attribute label in the actual change and adds a distinct question. It also rates the prospective potential to change the focal relationship. It does not receive current candidate outcomes.
3. **Select two.** The coordinator selects a portfolio using prospective relationship-change potential and the additional attribute and concept coverage it offers. Outcomes have not yet been generated.
4. **Assess the matched settings.** Each selected comparison receives two fresh calls using the frozen decision prompt. Both rate both settings; the second reverses setting and fact order. Assessment calls can run concurrently within a configured limit.
5. **Update memory.** The coordinator adds the proposals, selection and numerical results to the record. The next planner interprets this evidence, avoids repeated contrasts and chooses useful questions to pursue.

This sequence repeats until the round budget is exhausted. A promising result does not terminate the search. Five rounds allocate ten final comparisons. Interpretation and revision happen before selection and across rounds; there is no additional outcome-driven selection within a completed round.

## Portfolio selection

Selection balances three terms: prospective yield potential (weight 0.50), newly tested attributes (0.30) and newly tested concepts (0.20). The historical rule normalizes the 0–2 yield rating by two, new attribute coverage by two, and concept coverage by seven. A deterministic tie-break makes the choice reproducible.

Magnitude is measured after assessment rather than treated as a forecast known to the selector. Later planning can examine both large and small prior changes. Reusing a broad concept is permitted when a candidate asks a different, useful question; there are no mandatory topic assignments for particular rounds.

Final evaluation independently codes coverage from the facts. Search labels support planning without becoming an unquestioned claim about the output's breadth.

The default search dictionary contains 25 observable attributes. A study can supply its own `attributeDefinitions` and `attributeConcepts` mappings, with each search attribute assigned to one of the seven starting concepts. This dictionary is fixed for the run. Final coverage coding builds a shared vocabulary from the actual contrasts and can retain additional conceptual categories.

## Information boundaries

| Component | Receives | Does not receive |
| --- | --- | --- |
| Planner | Fixed study, earlier proposals, selected pairs and numerical results | Current candidates' future assessments |
| Reviewer | Fixed study, current candidates and earlier designs | Simulated outcome history |
| Decision agent | Task, X contrast, outcome definition and factual settings | Search history, expected directions, selection scores, planner mechanisms or method labels |
| Coverage coder | Pooled eligible factual contrasts and fixed task | Method labels, scores, titles, proposed codes or earlier coding |

The decision agent's short explanation records reported considerations, not private reasoning. Numerical results, rather than reconstructed reasoning traces, form the executed feedback record. Learning here means using a growing research memory; it does not update model weights.

## Direct-generation comparison

The baseline produces the full portfolio in one call from a simple prompt. It uses the same fixed task and factual requirements, without adaptive feedback or a search-time attribute dictionary. Both methods pass through the same evaluation requirements and receive the same two-assessment instrument. Rejected final slots remain visible rather than being replaced with favorable results.

A common coding pass pools both methods' eligible contrasts, giving identical variables the same code. The report combines this coding with deterministic yield and magnitude calculations. The baseline has fewer generation and review calls, so equal final portfolios do not imply equal cost.

## Runtime and records

The Node.js coordinator sends English system messages and JSON user payloads to a Python bridge using the `openai` library. Each request is non-streaming and contains no previous conversation. The bridge records the returned model and token usage. Credentials remain in environment variables.

Accepted calls are stored and reused when resuming the same run. Requests with an uncertain completion status require an explicit retry; valid results are not rerolled. Runtime and input fingerprints prevent an interrupted study from silently continuing under changed prompts or settings.

For a complete default run, planning and assessment require 30 calls for ContextAtlas (five planning, five review and twenty assessment calls) and 21 for direct generation (one generation and twenty assessment calls). Two eligibility judgments and one coverage pass bring standalone totals to 33 and 24. Deferring standalone evaluation and then evaluating the methods together uses 54 calls: 30 + 21 + 3 common calls. A round with too few eligible candidates can use fewer assessment calls while retaining the allocated denominator. Actual consumption appears in the call ledger and usage summary.

The public API workflow and the website's five-study collection use the matched-comparison design. Figure 1 and the [measurement guide](MEASUREMENT.md) describe how comparisons are constructed and assessed.
