# Measurement

The unit of search is a **matched contextual comparison**. Its two settings share the X contrast, Y definition, unit, time horizon and common facts. They differ on one observable contextual condition.

Each decision-agent call rates the X–Y relationship in both settings on a signed scale from −100 to +100. A positive rating means that moving from the stated lower X to higher X increases Y; a negative rating means it decreases Y. Zero indicates little or no relationship. A rating is a model judgment, not an observed effect size or probability.

Two fresh calls assess each pair. The second reverses setting and fact order. The coordinator maps opaque IDs back to the same reference and changed settings before calculating results. A `null` rating records insufficient information.

## Yield

For assessment `j`:

```text
delta[j] = changed_rating[j] - reference_rating[j]
```

A qualifying comparison must be eligible, have complete scores in both assessments, and satisfy:

```text
delta[1] * delta[2] > 0
min(abs(delta[1]), abs(delta[2])) >= 10
```

Yield divides qualifying comparisons by **all allocated final slots**. The default denominator is ten per study and method. Rejected or unevaluable slots remain in that denominator and are not replaced after seeing results. The ten-point cutoff is a reporting convention, not a significance threshold. A relationship becoming stronger or weaker can qualify without reversing sign.

## Magnitude

For an eligible pair with complete scores:

```text
stable_magnitude = min(abs(delta[1]), abs(delta[2]))  if the deltas share a nonzero sign
stable_magnitude = 0                              otherwise
```

The reported magnitude is the mean across **eligible, completely evaluated comparisons**, including those below the yield threshold. Missing scores remain missing; they are not converted into zero for this mean. Reports give the contributing count alongside the allocated count.

Changes of +18 and +12 give a magnitude of 12 and qualify for yield. Changes of +18 and −12 give a magnitude of zero. Changes of +8 and +12 give a magnitude of 8 but do not qualify.

When pooling studies, magnitude is calculated over eligible, complete comparisons rather than as an unweighted mean of rounded study means. A supplementary budget-based mean can divide summed magnitudes by all allocated slots, but must be labeled separately.

## Attribute coverage

Attribute coverage counts distinct **observable variables actually changed** among eligible comparisons. The coder builds a shared vocabulary from factual contrasts. Rewording a variable, using another pair of values or reversing a contrast does not create another attribute. Held conditions and proposed but unselected ideas do not count.

Changing launch delay from one to six months and from two to eight months explores one attribute: launch delay. Changing launch delay and changing exit compensation explores two, even when both belong to adaptation costs.

Coverage is a count, not a percentage of an exhaustive universe. With ten comparisons, attribute coverage cannot exceed ten when each comparison changes one primary attribute.

## Concept coverage

Each coded attribute receives one primary conceptual category. Concept coverage counts the distinct categories represented by those attributes. The starting definitions distinguish:

| Concept | Feature being changed |
| --- | --- |
| Uncertainty | Availability, reliability or predictability of evidence about a state |
| Interdependence | Dependence among tasks, actions or payoffs, including coordination and conflicting interests |
| Heterogeneity | Variation or compatibility among parties' capabilities, resources, preferences or interpretations |
| Adaptation costs | Effort, expense, delay or recoverability involved in implementing, changing or leaving an arrangement |
| Institutional constraints | Rules, rights, permissions, authority or enforcement scope |
| Knowledge and learning | Accumulation, retention, transfer or reuse of experience and routines |
| Resource conditions | Available staffing, funds, buffers or other capacity |

A clearly different variable may receive an additional, consistently named category. The total includes these categories, with their names retained for inspection. The seven starting categories are a project coding convention, not an exhaustive taxonomy attributed to Levinthal and Rosenkopf.

The distinction follows **nominal context → contextual attribute → conceptual category**. For example, “shipping” identifies a setting, “local consent authority” is an observable attribute, and “institutional constraints” supplies its conceptual interpretation. This release does not count renamed industries as new attribute coverage or claim to have searched every nominal setting.

## Common coding and eligibility

For a method comparison, one fresh coding call receives pooled eligible pairs from both methods within a study. It sees the fixed task and factual contrasts, but no method labels, scores, titles, proposed attribute names or earlier codes. It defines the shared vocabulary, codes each pair and assigns one primary concept per attribute. The coordinator computes counts from those codes.

Eligibility is separate. Two fresh, blinded judgments inspect the factual pairs in opposite orders; both must admit a pair. They check whether it preserves the focal relationship, changes a clear contextual condition and leaves both X levels meaningful. Coverage concerns how the admitted contrasts relate to one another. Coding a condition does not establish that it changes the relationship.

Search-time labels help select candidates and guide memory; they are not the final comparative coverage score. Coding a single run describes its breadth, while pooled coding provides a shared vocabulary for comparing methods. Mean coverage across studies is a mean of study-level counts, not the number of globally unique attributes or concepts.

## Interpretation and budget

Both methods receive the same final slot budget and assessment interface. ContextAtlas also uses planning, review and accumulated results. Report API usage separately rather than treating equal portfolio size as equal computational cost.

Ten pairs require twenty assessment calls and forty relationship ratings per method, before planning, review and coding. Each request starts without conversation history. The reference setting is local to each comparison; there is no separate universal baseline response distribution.

The search is adaptive. Its results identify candidate empirical contrasts, not a representative sample of all possible environments. The completed evaluation uses assessments that also informed later search. Independent final assessments, equal-budget comparisons and empirical studies provide distinct next tests.
