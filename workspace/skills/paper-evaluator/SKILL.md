---
name: paper-evaluator
description: >
  Evaluates AI/ML research papers for quality, novelty, reproducibility, and field impact.
  Scores papers across multiple criteria and produces a ranked shortlist. ALWAYS use this
  skill when the user asks to evaluate, score, rank, filter, assess quality, or compare
  research papers. Also trigger for "which papers are worth reading", "rate these papers",
  "find the best papers from this list", "is this paper significant", or any request to
  judge or prioritize research.
---

# Paper Evaluator Skill

Score and rank research papers across quality, novelty, impact, and reproducibility dimensions.

## Progressive loading

- Scoring rubric details → `references/rubric.md`
- Red flags and quality signals → `references/rubric.md`

---

## Workflow

### Step 1 — Gather paper data

For each paper to evaluate:
1. If only a title/URL is given, call `fetchPaperDetails` to get the full abstract
2. If a paper ID from a prior search is available, use that data directly — don't re-fetch
3. Call `searchSemanticScholar` to check citation count and influential citations

### Step 2 — Score each paper

Score every paper on all 5 dimensions from `references/rubric.md`:
- **Novelty** (0–20): Is the core idea genuinely new?
- **Technical rigor** (0–20): Is the methodology sound?
- **Results quality** (0–20): Are claims supported by strong experiments?
- **Reproducibility** (0–20): Could others replicate this?
- **Field impact** (0–20): Will this influence future work?

Total: 0–100. See `references/rubric.md` for scoring criteria.

### Step 3 — Format evaluation output

For each paper, output:

```
### {Title}
**Score: {total}/100** | Novelty: {n}/20 | Rigor: {r}/20 | Results: {res}/20 | Reproducibility: {rep}/20 | Impact: {i}/20

**Verdict:** {One sentence — should they read it? Why?}

**Strengths:**
- {Strength 1}
- {Strength 2}

**Weaknesses / Concerns:**
- {Concern 1}
- {Concern 2}

**Recommended for:** {Practitioners | Researchers | Both | Skip}
```

### Step 4 — Produce ranked summary

After all individual evaluations:

```
## Ranked Shortlist

| Rank | Title | Score | Recommended for |
|------|-------|-------|-----------------|
| 1    | ...   | 87    | Researchers     |
| 2    | ...   | 79    | Both            |
...

## Must-read this week
{1-2 sentences on the single most important paper and why.}
```

---

## Evaluation principles

- Be honest — a low score is more useful than false praise
- Back every score with a specific observation from the abstract or results
- Flag papers that claim SOTA without strong baselines as suspicious
- A well-executed incremental paper (score 65) is better than a sloppy "revolutionary" one (score 40)
- If you cannot evaluate a dimension due to missing data, score it 10/20 and note `[limited data]`
