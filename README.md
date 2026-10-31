# ContextAtlas

ContextAtlas uses AI agents to help researchers explore the conditions under which a relationship may strengthen, weaken or reverse. Give it a research question and a starting context. It proposes alternative settings, assesses how the relationship changes, and uses what it finds to guide the next round of exploration.

The result is a **context atlas**: a collection of contextual comparisons, model assessments and ideas for follow-up studies. Each comparison records what changed, what stayed fixed and why the difference may matter.

**[Open the research studio](https://contextatlas-research-studio.jzhengas.chatgpt.site/)** to explore the workflow and browse examples.

## How it works

1. **Define the relationship.** Specify the factor of interest (X), the outcome (Y) and the original setting. Keep X, Y, the unit of analysis and the time horizon consistent throughout the search.
2. **Develop contextual comparisons.** The planner proposes pairs of settings that differ in one observable condition. For example, a shipping alliance might require approval from a central executive in one setting and consent from local managers in the other.
3. **Review and select.** The system checks whether each comparison is coherent and feasible, then selects promising questions that also broaden the range of attributes and concepts explored.
4. **Assess the relationship.** Decision agents assess the same X–Y relationship in both settings. Each pair receives two independent assessments, with the presentation order reversed in the second. These agents see the task and facts; the planner's expectations and search history remain separate.
5. **Build on earlier rounds.** The planner uses a growing record of proposals and results to avoid repeating comparisons and pursue unresolved questions. Search continues until the chosen round budget is reached.

By default, each of five rounds proposes four comparisons and selects two, producing up to ten comparisons in total. The atlas connects concrete contextual attributes, such as approval rights, to broader concepts, such as institutional constraints. Its report summarizes how often the assessed relationship changes, how large those changes are, and the range of attributes and concepts explored.

![From a research question to a context atlas](docs/media/figure1.svg)

*The workflow connects study design, contextual search and relationship assessment through a research memory available to the planner. [View as PDF](docs/media/figure1.pdf) · [PNG](docs/media/figure1.png).*

## Illustrative examples

The [research studio](https://contextatlas-research-studio.jzhengas.chatgpt.site/) includes five illustrative examples drawn from research on alliances and partner choice. Open **Five research studies** to browse the questions, follow the search rounds and inspect individual comparisons. You can explore these saved examples without an API key or starting a new search.

**Start with a question.** The studio guides you through defining the relationship, describing its context and choosing how many rounds to explore.

![Research studio setup and workflow guide](docs/media/research-workflow.gif)

**Look inside a comparison.** The shipping example asks when complementary market coverage helps firms form an alliance. Open a comparison to inspect the two settings, the assessments, a possible mechanism and an alternative explanation.

![Shipping example: search rounds, contextual comparisons and research rationale](docs/media/matched-comparison.gif)

**Connect questions across studies.** Browse the five examples to see how different findings lead to questions about information, authority, coordination and organizational experience.

![Five illustrative studies, their summaries and connections across research questions](docs/media/study-findings.gif)

## Run locally

This repository provides the workflow as a command-line application. You can adapt the study inputs and prompts, run searches with your own API credentials, and keep the complete research record locally.

For an API run, install **Node.js 22.13 or later** and **Python 3.10 or later**. From the repository folder, run:

```bash
npm ci
python -m pip install -r requirements.txt
```

To explore the workflow without an API key, run the offline demo. It uses built-in sample responses and saves an example report in `runs/offline-demo/`.

```bash
npm run demo
```

### Run a search with OpenAI

The configuration example uses OpenAI **GPT-6 Astra** through the Python `openai` library. Copy `.env.example` to `.env` and enter your API key:

```dotenv
OPENAI_API_KEY=your-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-6-astra
LLM_REASONING_EFFORT=low
LLM_TOKEN_PARAMETER=max_completion_tokens
```

Then run the shipping example:

```bash
npm run run -- --input examples/shipping-complementarity.json --output runs/shipping-atlas
```

Open `runs/shipping-atlas/report.md` to read the resulting atlas. The same folder contains the individual comparisons, assessments and search memory. Prompts and saved records are in English, and API requests are non-streaming.

Compatible API endpoints can be configured through the same `.env` file. If Python is not on your system path, set `PYTHON` to its executable path. The [architecture guide](docs/ARCHITECTURE.md) explains the runtime and model interface.

## Explore your own question

Start with an input from [`examples/`](examples/) and adapt it to your research question. The examples cover market uncertainty, market complementarity, status similarity, network centrality and experience with new partners.

A study input defines:

- **The relationship:** X, Y and the lower-to-higher change in X to assess.
- **The setting:** the actors, unit of analysis, time horizon and shared facts.
- **The search budget:** the number of rounds, with two comparisons selected per round.

For example, the [shipping input](examples/shipping-complementarity.json) asks whether greater market complementarity makes a vessel-sharing alliance more likely. The search explores conditions that may change that relationship, such as who can authorize access to a partner's markets.

Save your input as `examples/my-study.json`, then run:

```bash
npm run run -- --input examples/my-study.json --output runs/my-study
```

You can also prepare a draft input from a paper. Save the relevant research excerpt as a UTF-8 text file and run:

```bash
npm run extract -- --input path/to/paper.txt --output runs/extraction.json
```

The extraction includes a `suggestedStudy`, supporting evidence and questions to resolve. Review the draft, save the study specification as a separate JSON file, and use it as the input to a search.

## Work with the results

Each run saves a readable report alongside structured data and the full record of how the atlas developed.

| File | What you can use it for |
| --- | --- |
| `report.md`, `report.json` | Read the contextual comparisons and the four summary measures: yield, magnitude, attribute coverage and concept coverage |
| `results.csv` | Analyze individual comparisons and rating changes |
| `study.json` | Inspect proposals, reviews, selected pairs and assessments |
| `memory.json` | Follow the record used to plan later rounds |
| `calls/*.json` | Inspect the exact model requests and responses |
| `manifest.json`, `usage.json` | Check the run configuration and API usage |

To continue an interrupted search, use its existing output folder:

```bash
npm run resume -- --output runs/my-study
```

The workflow resumes from its saved progress and reuses completed responses. Use a new output folder when changing the study, prompts or model settings. API credentials and local run outputs are excluded from Git by default.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): how the modules work together, share information and maintain research memory.
- [Measurement](docs/MEASUREMENT.md): how yield, magnitude, attribute coverage and concept coverage are calculated.
- [Prompts](docs/PROMPTS.md): the instructions and input formats for each agent.
- [Research examples and evaluation](docs/RESULTS.md): the studies behind the examples and the evaluation approach.

To run the software checks, use `npm test`.
