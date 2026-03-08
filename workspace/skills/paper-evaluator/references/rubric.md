# Evaluation Rubric

## Dimension 1 — Novelty (0–20)

| Score | Criteria |
|-------|----------|
| 18–20 | Fundamentally new idea, paradigm shift, or first-of-its-kind result |
| 14–17 | Clear novel contribution — new method, new benchmark, new finding |
| 10–13 | Incremental improvement on existing work with meaningful new insight |
| 5–9 | Minor variation or extension of prior work |
| 0–4 | No clear novel contribution; re-implements or describes known work |

**Red flags:** "We propose a simple extension of X" without strong results; title contains "revisiting" or "survey" without genuine new findings.

---

## Dimension 2 — Technical Rigor (0–20)

| Score | Criteria |
|-------|----------|
| 18–20 | Rigorous theoretical analysis OR thorough ablation studies; methodology clearly justified |
| 14–17 | Solid experimental design; comparisons to relevant baselines |
| 10–13 | Adequate methodology but missing some ablations or baseline comparisons |
| 5–9 | Weak experimental design; cherry-picked comparisons |
| 0–4 | No meaningful experiments; methodology unclear or unjustified |

**Red flags:** Comparing only to weak/outdated baselines; no ablation studies for a complex method; claim of improvement without statistical significance.

---

## Dimension 3 — Results Quality (0–20)

| Score | Criteria |
|-------|----------|
| 18–20 | Large, consistent improvements on multiple strong benchmarks; results clearly presented |
| 14–17 | Solid improvements on relevant benchmarks; some variance reported |
| 10–13 | Moderate improvements; results on limited benchmarks |
| 5–9 | Small or inconsistent gains; benchmark selection questionable |
| 0–4 | No quantitative results; results uninterpretable or fabricated-seeming |

**Red flags:** Improvements < 0.5% on established benchmarks without strong theoretical justification; benchmarks not widely used in the community; no error bars/variance.

---

## Dimension 4 — Reproducibility (0–20)

| Score | Criteria |
|-------|----------|
| 18–20 | Code released; detailed hyperparameters; uses public datasets |
| 14–17 | Code promised or partially released; sufficient detail to attempt replication |
| 10–13 | No code but detailed enough methods section to re-implement |
| 5–9 | Limited implementation details; proprietary data or models |
| 0–4 | No code, no details, proprietary everything — impossible to verify |

**Bonus signals:**
- GitHub link in abstract/paper → +2
- Open dataset → +1
- Model weights released → +2

---

## Dimension 5 — Field Impact (0–20)

Use citation data from Semantic Scholar + venue signals:

| Score | Criteria |
|-------|----------|
| 18–20 | Already highly cited; published at NeurIPS/ICML/ICLR/CVPR oral; from top lab |
| 14–17 | Conference paper or journal; moderate early citations; addresses hot research area |
| 10–13 | Preprint with growing attention; addresses active research question |
| 5–9 | Low engagement; niche topic; limited audience |
| 0–4 | No citations; addresses solved problem; very narrow application |

**Impact boosters:**
- NeurIPS / ICML / ICLR / CVPR oral or spotlight: +4
- Top lab (DeepMind, Meta AI, OpenAI, Stanford HAI): +3
- Nature MI / IEEE TPAMI: +3
- HuggingFace upvotes > 100: +2
- influentialCitationCount > 5: +3

---

## Score interpretation

| Total | Verdict |
|-------|---------|
| 85–100 | **Essential read** — bookmark immediately |
| 70–84 | **Highly recommended** — read this week |
| 55–69 | **Worth reading** — add to reading list |
| 40–54 | **Optional** — skim abstract only |
| < 40 | **Skip** — not worth the time |
