---
name: paper-researcher
description: >
  Discovers, searches, and formats AI/ML research papers from arxiv, Semantic Scholar,
  HuggingFace Papers, top AI conferences (NeurIPS, ICML, CVPR, ICLR, AAAI), top journals
  (Nature MI, IEEE TPAMI, JAIR), and research labs (DeepMind, Meta AI, OpenAI, Stanford HAI).
  Produces perfectly structured paper digests with TL;DR, problem, method, results, impact,
  and tags. ALWAYS use this skill when the user asks to find papers, run a digest, search
  research, summarize recent work, or mentions any of the above sources. Also trigger for
  "what's new in AI", "weekly papers", "top papers", "find me papers on X", or any research
  discovery request — even if phrased casually.
---

# Paper Researcher Skill

Discover and format AI/ML research papers into a structured digest from all major sources.

## Reference files — load only as needed
- Search strategy and scoring weights → `references/sources.md`
- Output format template → `references/format.md`

---

## Workflow

### Step 1 — Clarify scope (briefly)

Before searching, confirm:
- **Topic**: what the user is interested in (default: LLMs, reasoning, agents, multimodal, efficiency)
- **Time window**: past 7 days unless specified
- **Depth**: quick scan (abstracts) or deep (fetch full details with `fetchPaperDetails`)

If the user's request is clear, skip asking and proceed directly.

### Step 2 — Search all sources in parallel

Fire all tool calls in a **single turn** — never wait for one to finish before starting the next:

| Tool | Source |
|------|--------|
| `searchArxiv` | arxiv cs.AI, cs.LG, cs.CL, stat.ML |
| `searchSemanticScholar` | Citation-ranked recent papers |
| `searchHuggingFacePapers` | Community upvoted daily papers |
| `searchConferencePapers` | NeurIPS, ICML, CVPR, ICLR, AAAI, Nature MI, IEEE TPAMI, JAIR |
| `searchResearchLabs` | DeepMind, Meta AI, OpenAI, Stanford HAI |

If a source returns empty (rate limit or error), continue with the others — don't retry or wait.

### Step 3 — Deduplicate and rank

1. Deduplicate by title (fuzzy — same paper often appears on arxiv AND HuggingFace)
2. Score each paper using weights from `references/sources.md`
3. Select top 5–10 by combined score; boost conference/lab papers when recency is equal

### Step 4 — Format every selected paper

Load `references/format.md` and use the exact template. Never skip a field — write `[not available]` if data is missing. Never fabricate numbers, author names, or citations.

### Step 5 — Assemble digest closing

```
## This Week's Theme
[1-2 sentences on the dominant trend]

## Sources Searched
arxiv · Semantic Scholar · HuggingFace Papers · NeurIPS · ICML · CVPR · ICLR · AAAI ·
DeepMind · Meta AI · OpenAI · Stanford HAI
```

### Step 6 — Offer to save results

After presenting the digest, say:
> "Want me to email you these results? Just share your address."

Use `sendEmail` if they say yes. The tool handles cases where email is not yet configured.
