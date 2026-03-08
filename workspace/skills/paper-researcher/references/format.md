# Paper Summary Format

Use this exact template for every paper. No deviations.

---

## {N}. {Title}

**Source:** {arxiv | NeurIPS | ICML | CVPR | ICLR | AAAI | Nature MI | IEEE TPAMI | DeepMind | Meta AI | OpenAI | Stanford HAI | Semantic Scholar}
**Link:** {URL}
**Authors:** {First Author}, {Second Author}[, et al. if >3]
**Institution:** {University/Lab name}
**Published:** {Date}
**Tags:** `{Tag1}` `{Tag2}` `{Tag3}`

### TL;DR
> {One plain-English sentence. No jargon. Someone outside ML should understand it.}

### Problem
{What challenge does this paper address? Why does it matter? 1-2 sentences.}

### Method
{The key idea — what did they do differently? 2-3 sentences. Focus on the novel contribution, not background.}

### Results
{Concrete numbers if available. Benchmark name + score + comparison to prior SOTA.
Example: "Achieves 87.3% on MMLU, +4.2pp over GPT-4o baseline."}

### Why It Matters
{Impact on the field. Who should read this? What does it unlock? 1-2 sentences.}

---

## Example (filled in)

## 1. Chain-of-Thought Prompting Elicits Reasoning in Large Language Models

**Source:** NeurIPS
**Link:** https://arxiv.org/abs/2201.11903
**Authors:** Jason Wei, Xuezhi Wang, et al.
**Institution:** Google Brain
**Published:** January 2022
**Tags:** `LLM` `Reasoning` `Prompting`

### TL;DR
> Adding step-by-step reasoning examples to prompts makes large language models dramatically better at math and logic problems.

### Problem
Large language models fail at multi-step reasoning tasks like math word problems, even when they know the relevant facts — because they generate answers in one shot without working through the steps.

### Method
The authors show that including a few "chain-of-thought" examples in the prompt — where each example shows the full reasoning trace before the answer — causes the model to generate its own reasoning traces and arrive at correct answers significantly more often.

### Results
Chain-of-thought prompting improves accuracy on GSM8K from 17.9% to 58.1% with PaLM 540B. Gains are consistent across math, commonsense, and symbolic reasoning tasks.

### Why It Matters
This simple prompting technique became foundational for all subsequent work on LLM reasoning. Anyone building reasoning-heavy applications should understand this pattern.
