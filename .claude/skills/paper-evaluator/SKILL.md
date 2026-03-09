---
name: paper-evaluator
description: >
  Evaluates AI/ML research papers for quality, novelty, reproducibility, and field impact.
  Scores papers across multiple criteria and produces a ranked shortlist. ALWAYS use this
  skill when the user asks to evaluate, score, rank, filter, assess quality, or compare
  research papers. Also trigger for "which papers are worth reading", "rate these papers",
  "find the best papers from this list", "is this paper significant", "should I read this",
  or any request to judge or prioritize research — even if phrased informally.
---

# Paper Evaluator Skill

Score and rank research papers across quality, novelty, impact, and reproducibility.

## Reference files — load only as needed
- Full scoring rubric with criteria per level → `references/rubric.md`

---

## Workflow

### Step 1 — Gather paper data

For each paper to evaluate:
1. If only a title/URL is given → call `fetchPaperDetails` to get the abstract
2. If a paper ID from a prior search is available → use that data directly (don't re-fetch)
3. Call `searchSemanticScholar` to check citation count and influential citations

### Step 2 — Score on 5 dimensions

Load `references/rubric.md` for the full criteria. Each dimension is scored 0–20:

| Dimension | What it measures |
|-----------|-----------------|
| **Novelty** | Is the core idea genuinely new? |
| **Technical Rigor** | Is the methodology sound with proper ablations? |
| **Results Quality** | Are claims backed by strong experiments on relevant benchmarks? |
| **Reproducibility** | Can others replicate this? Is code/data available? |
| **Field Impact** | Will this influence future work? Citations, venue, lab signals. |

**Total: 0–100.** Back every score with a specific observation from the abstract or results — a score without evidence is not useful.

### Step 3 — Format each evaluation

```
### {Title}
**Score: {total}/100** | Novelty: {n}/20 | Rigor: {r}/20 | Results: {res}/20 | Reproducibility: {rep}/20 | Impact: {i}/20

**Verdict:** {One sentence — should they read it? Why?}

**Strengths:**
- {Strength 1}
- {Strength 2}

**Weaknesses / Concerns:**
- {Concern 1}

**Recommended for:** {Practitioners | Researchers | Both | Skip}
```

### Step 4 — Ranked summary

```
## Ranked Shortlist

| Rank | Title | Score | Recommended for |
|------|-------|-------|-----------------|
| 1    | ...   | 87    | Researchers     |

## Must-read this week
{1-2 sentences on the single most important paper and why.}
```

### Step 5 — Offer to save results

After presenting the evaluation, say:
> "Want me to email you this ranked list? Just share your address."

Use `sendEmail` if they say yes.

---

## Principles

- Honesty over flattery — a low score is more useful than false praise
- Flag papers that claim SOTA without strong baselines as suspicious
- A well-executed incremental paper (65/100) is better than a sloppy "revolutionary" one (40/100)
- Score missing dimensions as 10/20 and note `[limited data]`
