# Initial evaluation

The completed evaluation asks whether iterative search finds more consequential contextual comparisons than direct generation. Both methods used ChatGPT 6 Astra and allocated ten final comparisons for each of five study backgrounds. The table reports finalized eligibility and single-coder coverage results. It is archived evidence, not output from the offline demo. A [machine-readable summary](example-evidence/five-study-summary.json) preserves the values and source information.

## Five study backgrounds

| Study | Method | Yield | Magnitude | Attributes | Concepts |
| --- | --- | ---: | ---: | ---: | ---: |
| Beckman et al. (2004) | Direct generation | 3/10 | 6.3 | 10 | 4 |
| | ContextAtlas | 6/10 | 14.1 | 9 | 5 |
| Mitsuhashi and Greve (2009) | Direct generation | 3/10 | 7.2 | 9 | 3 |
| | ContextAtlas | 9/10 | 29.2 | 10 | 4 |
| Chung et al. (2000) | Direct generation | 3/10 | 5.9 | 10 | 5 |
| | ContextAtlas | 2/10 | 7.7 | 9 | 7 |
| Ahuja et al. (2009) | Direct generation | 6/10 | 15.5 | 10 | 7 |
| | ContextAtlas | 5/10 | 12.5 | 10 | 4 |
| Lavie and Rosenkopf (2006) | Direct generation | 3/10 | 7.5 | 10 | 6 |
| | ContextAtlas | 5/10 | 9.0 | 10 | 6 |
| **Overall / mean** | **Direct generation** | **18/50 (36%)** | **8.5** | **9.8** | **5.0** |
| | **ContextAtlas** | **27/50 (54%)** | **14.6** | **9.6** | **5.2** |

Yield retains all allocated slots. Magnitude averages eligible comparisons with complete assessments: 49 for direct generation and 48 for ContextAtlas. Coverage counts eligible contrasts; the last row gives mean coverage per study. Full definitions are in [Measurement](MEASUREMENT.md).

The result is more qualifying changes within similar breadth. ContextAtlas has higher yield in three tasks, while direct generation has higher yield in two. Six of the nine additional qualifying comparisons come from shipping; without that study, the counts are 18/40 versus 15/40. Attribute coverage is close to the ten-comparison ceiling in both methods.

## What the comparisons reveal

**Market uncertainty and familiar partners — Beckman et al.** The focal relationship connects market uncertainty to additional alliances with existing partners. ContextAtlas's useful contrasts concern independent market information, lender authorization and delayed customer feedback. They distinguish information carried by familiar relationships from the firm's ability to use it. Direct generation also finds consequential conditions, including alliance staffing, financial disclosure and termination notice periods.

**Complementary markets and shipping alliances — Mitsuhashi and Greve.** This task asks when nonoverlapping market coverage supports a vessel-sharing alliance. The largest ContextAtlas contrast changes approval authority: central executives authorize partner access after consultation, or every affected local manager must consent. Local managers' sales incentives and anticipated account competition remain fixed. Both assessments rate the relationship +40 in the first setting and −25 in the second, a 65-point change. The contrast requires consent but does not prescribe refusal.

The resulting question is how complementary portfolios become usable commercial access. Related comparisons concern separate market authorization, launch delays and arbitration over promised access. Direct generation's strongest contrast expands an agreement from a common market to selected other markets, producing a 35-point increase in both assessments. Changing meeting or payment-settlement frequency produces no relationship change. These examples distinguish administrative details from conditions governing access to the resources that make complementarity valuable.

**Status similarity and syndicate inclusion — Chung et al.** Both methods find relatively few qualifying comparisons. Direct generation identifies reduced public visibility, larger syndicates and issuer approval of the roster. ContextAtlas's strongest contrast concerns fees tied to each bank's credited sales at the expense of other banks. It explores more conceptual categories but has lower yield. Greater breadth does not guarantee that more tested conditions will change the relationship.

**Partner centrality and alliance formation — Ahuja et al.** Direct generation has higher yield and magnitude. Both methods find that commercial market overlap weakens the relationship between a potential partner's centrality and alliance formation for a peripheral focal firm. ContextAtlas also develops knowledge-control contrasts: faster remedies for unauthorized disclosure and mutual consent for disclosure strengthen the assessed relationship. Direct generation finds related value in consent over third-party licensing. These shared findings identify empirical questions accessible to both approaches.

**Alliance experience and subsequent exploration — Lavie and Rosenkopf.** ContextAtlas has higher yield and magnitude, with equal attribute and concept counts. Giving an incoming team documented search, screening and onboarding procedures strengthens the relationship by 25 points in both assessments; requiring redevelopment of established procedures weakens it by 25 points. Direct generation also finds relevant contrasts in team turnover and a searchable alliance repository. The methods share a knowledge-retention theme; ContextAtlas's advantage concerns the number of useful contrasts within that portfolio.

## Decision-agent calibration

Before search evaluation, the decision prompt and task presentation were developed using organizational-governance results. Fresh confirmation matched five of six supported contextual patterns from Krishnan et al. (2016), and six of eight directional components from Geyskens et al. (2006). These are source-informed calibration results: the papers helped develop the instrument, so the counts are not a held-out accuracy estimate.

The calibration motivated keeping the same prompt across search methods. It did not establish that a rating predicts an organization's realized choice or performance. The search outputs provide explicit contrasts and hypotheses for that next empirical step.

## What this comparison establishes

The evaluation compares complete procedures at equal final portfolio size. ContextAtlas uses more planning and review, so it does not isolate the contribution of memory or establish an advantage at equal call cost. Historical successful search and assessment calls totaled 150 for ContextAtlas and 103 for direct generation, excluding common eligibility and coverage work.

Earlier assessments also guided later search. A useful next evaluation would score final selections in a fresh assessment pass and compare memory-enabled and memory-disabled searches under the same call budget. Independent organizational data would address a different question: which proposed contextual effects occur outside the model.

The API release preserves the matched-comparison design and measurement rules while adding reusable execution, checkpointing and provider configuration. New runs have their own responses and must not be presented as reproducing these archived numbers without making that comparison.
