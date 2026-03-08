# Source Reference Guide

## Source inventory and search strategy

### Tier 1 — Real-time feeds (search every run)

| Source | Tool | What it gives you |
|--------|------|-------------------|
| arxiv | `searchArxiv` | Latest preprints, cs.AI/cs.LG/cs.CL/stat.ML |
| HuggingFace Papers | `searchHuggingFacePapers` | Community-curated daily papers, upvote-ranked |
| Semantic Scholar | `searchSemanticScholar` | Citation-velocity ranked, cross-venue |

### Tier 2 — Conferences and journals (search every run)

| Source | Tool | Venue |
|--------|------|-------|
| NeurIPS | `searchConferencePapers` | venue="neurips" |
| ICML | `searchConferencePapers` | venue="icml" |
| CVPR | `searchConferencePapers` | venue="cvpr" |
| ICLR | `searchConferencePapers` | venue="iclr" |
| AAAI | `searchConferencePapers` | venue="aaai" |
| Nature Machine Intelligence | `searchConferencePapers` | venue="nature-mi" |
| IEEE TPAMI | `searchConferencePapers` | venue="tpami" |
| IEEE TNNLS | `searchConferencePapers` | venue="tnnls" |
| JAIR | `searchConferencePapers` | venue="jair" |

### Tier 3 — Research lab feeds (search every run)

| Lab | Tool | What they publish |
|-----|------|-------------------|
| Google DeepMind | `searchResearchLabs` | lab="deepmind" |
| Meta AI (FAIR) | `searchResearchLabs` | lab="meta-ai" |
| OpenAI | `searchResearchLabs` | lab="openai" |
| Stanford HAI | `searchResearchLabs` | lab="stanford-hai" |

---

## Ranking / scoring weights

Use these weights to score papers for inclusion. Higher = more important.

| Signal | Weight | How to measure |
|--------|--------|----------------|
| Conference acceptance (NeurIPS/ICML/CVPR/ICLR) | +30 | venue field in result |
| Top lab authorship (DeepMind/Meta AI/OpenAI/Stanford) | +20 | authors/institution field |
| HuggingFace upvotes > 50 | +15 | upvotes field |
| Semantic Scholar citation spike | +15 | citationCount > 20 in past week |
| New SOTA on known benchmark | +25 | check abstract for "state-of-the-art", "outperforms" |
| arxiv only, low engagement | +0 | baseline |
| Journal paper (Nature MI, IEEE TPAMI) | +20 | venue field |

Pick papers with highest combined score. Break ties by recency.

---

## Source-specific notes

### arxiv
- Use categories: `cs.AI`, `cs.LG`, `cs.CL`, `stat.ML`
- Sort by `submittedDate` descending
- Filter: past 7 days only
- Watch for: same paper submitted to multiple categories (deduplicate by arxiv ID)

### HuggingFace Papers
- Endpoint: `https://huggingface.co/api/daily_papers`
- Already curated by the community — high signal-to-noise
- Papers here are almost always on arxiv too — check for duplication

### Semantic Scholar
- Best for: finding papers that are gaining traction fast
- Use `publicationDateOrYear` filter to limit to past 7 days
- `influentialCitationCount` is a strong signal of impact

### NeurIPS / ICML / ICLR
- These are indexed in Semantic Scholar — use venue filter
- Papers often also appear on arxiv — deduplicate by title
- Oral/spotlight papers are highest quality — mark them if the data includes this

### CVPR
- Vision-focused — include if query touches vision/multimodal
- Indexed in Semantic Scholar via `venue: CVPR`

### Research Labs
- DeepMind, Meta AI, OpenAI papers almost always appear on arxiv first
- Stanford HAI publishes reports and working papers that may not be on arxiv
- Use `searchResearchLabs` for affiliation-filtered Semantic Scholar results
