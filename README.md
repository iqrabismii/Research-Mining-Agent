# 🔬 Research Paper Mining Agent

An AI-powered research assistant that discovers, evaluates, and explains AI/ML papers. Runs fully locally — just add your Anthropic API key.

## What it does

- **Discover papers** from arxiv, Semantic Scholar, HuggingFace Papers, top conferences (NeurIPS, ICML, CVPR, ICLR, AAAI) and research labs (DeepMind, Meta AI, OpenAI, Stanford HAI)
- **Evaluate papers** — score novelty, rigor, results quality, reproducibility, and field impact
- **Chat with any paper** — paste an arxiv ID or abstract and ask questions
- **Generate code sketches** — get a rough implementation outline for any paper
- **Email results to yourself** _(optional)_ — save digests, evaluations, or code sketches to your inbox

## Quickstart

```bash
git clone https://github.com/iqrabismii/research-paper
cd research-paper
npm install
```

Create a `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

That's the only required key. Run:

```bash
npm run dev
```

Open **http://localhost:4111** → Mastra Studio

## Optional: Email setup

If you want the agent to email you results, add SMTP config to `.env`:

```env
SMTP_USER=you@gmail.com
SMTP_PASS=your-gmail-app-password   # myaccount.google.com/apppasswords
```

Then just tell the agent: _"Email me these results"_ — it will send them and walk you through setup if credentials are missing.

## How to use

### Find papers
Open **Agents → Paper Research Agent** and try:
```
Find top papers on reasoning from this week
What's new in multimodal LLMs?
Search for recent agent papers from NeurIPS and DeepMind
```

### Evaluate papers
```
Which of these papers is worth reading? [paste titles]
Score this paper for me: [paste abstract]
Rank the papers you just found
```

### Chat with a paper
Open **Agents → Paper Chat Agent** and try:
```
Explain arxiv paper 2201.11903
What are the limitations of this method?
Give me an implementation sketch for this paper
How does this compare to chain-of-thought prompting?
```

### Run a digest
Open **Workflows → paper-digest-workflow** → Run with:
```json
{
  "topics": "large language models,reasoning",
  "maxPerSource": 10,
  "recipientEmail": "you@example.com"
}
```

## Project structure

```
src/mastra/
├── agents/
│   ├── paper-research-agent.ts   # Discovery + evaluation
│   └── paper-chat-agent.ts       # Deep paper Q&A + code sketches
├── tools/
│   ├── load-skill.ts             # Loads skills from .claude/skills/
│   ├── send-email.ts             # Optional SMTP email
│   ├── search-arxiv.ts
│   ├── search-semantic-scholar.ts
│   ├── search-huggingface-papers.ts
│   ├── search-conference-papers.ts
│   ├── search-research-labs.ts
│   └── fetch-paper-details.ts
├── utils/
│   └── project-root.ts
├── workflows/
│   └── paper-digest-workflow.ts
└── index.ts

.claude/skills/
├── paper-researcher/   # Search & format skill
└── paper-evaluator/    # Score & rank skill
```

## Tech stack

- [Mastra](https://mastra.ai/) — agent framework
- [Claude Sonnet](https://anthropic.com/) — LLM (claude-sonnet-4-5)
- [Nodemailer](https://nodemailer.com/) — optional SMTP email
- [libsql](https://github.com/tursodatabase/libsql) — local SQLite storage

## License

MIT
