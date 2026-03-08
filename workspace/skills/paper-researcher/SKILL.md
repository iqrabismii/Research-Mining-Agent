---
name: paper-researcher
description: >
  Discovers, searches, and formats AI/ML research papers from arxiv, Semantic Scholar,
  HuggingFace Papers, top AI conferences (NeurIPS, ICML, CVPR, ICLR, AAAI), top journals
  (Nature MI, IEEE TPAMI, JAIR), and research labs (DeepMind, Meta AI, OpenAI, Stanford HAI).
  Produces perfectly structured paper digests with TL;DR, problem, method, results, impact,
  and tags. ALWAYS use this skill when the user asks to find papers, run a digest, search
  research, summarize recent work, or mentions any of the above sources. Also trigger for
  "what's new in AI", "weekly papers", "top papers", or any research discovery request.
---

# Paper Researcher Skill

Discover and format AI/ML research papers into a perfect structured digest from all major sources.

## Progressive loading

Load references only as needed:
- Search strategy details → `references/sources.md`
- Output format template → `references/format.md`
- Source-specific quirks → `references/sources.md`

---

## Workflow

### Step 1 — Determine scope

Before searching, clarify:
- **Topics**: what subjects? (default: LLMs, reasoning, agents, multimodal, efficiency)
- **Time window**: past 7 days unless otherwise specified
- **Sources**: use ALL sources unless user specifies
- **Depth**: quick scan (abstracts only) or deep (fetch full details)

### Step 2 — Search all sources in parallel

Use tools simultaneously — never sequentially:

| Tool | Source |
|------|--------|
| `searchArxiv` | arxiv cs.AI, cs.LG, cs.CL, stat.ML |
| `searchSemanticScholar` | Citation-ranked recent papers |
| `searchHuggingFacePapers` | Community upvotes |
| `searchConferencePapers` | NeurIPS, ICML, CVPR, ICLR, AAAI |
| `searchResearchLabs` | DeepMind, Meta AI, OpenAI, Stanford HAI |

Search each source with the same query in one turn. Don't wait for one to finish before starting the next.

### Step 3 — Deduplicate and rank

After collecting results:
1. Deduplicate by title (fuzzy match — same paper appears on arxiv AND HuggingFace)
2. Score each paper (see `references/sources.md` for scoring weights)
3. Select top 5–10 by combined score
4. If a paper is from a top conference or lab, boost its rank

### Step 4 — Format output

Format every selected paper using the **exact template** in `references/format.md`.

Never skip fields. If data is missing, write `[not available]` — don't omit the field.

### Step 5 — Assemble digest

After all individual summaries, add a closing section:

```
## This Week's Theme
[1-2 sentences on the dominant trend across this week's papers]

## Sources Searched
arxiv (cs.AI, cs.LG, cs.CL, stat.ML) · Semantic Scholar · HuggingFace Papers ·
NeurIPS · ICML · CVPR · ICLR · AAAI · DeepMind · Meta AI · OpenAI · Stanford HAI
```

---

## Quality rules

- Never fabricate benchmark numbers, author names, or citations
- If an abstract is vague or incomplete, note `[abstract unclear — skipped deep analysis]`
- Only include papers published within the requested time window
- Prefer papers with concrete results over position/opinion papers
- Conference and lab papers get priority if recency is equal
