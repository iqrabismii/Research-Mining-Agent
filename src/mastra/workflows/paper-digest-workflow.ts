import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { createTransport } from '../tools/send-email';
import { searchArxiv } from '../tools/search-arxiv';
import { searchSemanticScholar } from '../tools/search-semantic-scholar';
import { searchHuggingFacePapers } from '../tools/search-huggingface-papers';

// ─── Step 1: Fetch papers — calls tools directly (no agent, no token overhead) ─

const fetchPapersStep = createStep({
  id: 'fetch-papers',
  description: 'Fetches papers directly from arxiv, Semantic Scholar, and HuggingFace',
  inputSchema: z.object({
    topics: z.string().default('large language models,reasoning,agents,multimodal'),
    maxPerSource: z.number().default(10),
    recipientEmail: z.string().optional(),
  }),
  outputSchema: z.object({
    rawContent: z.string(),
    recipientEmail: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const query = inputData.topics.split(',').map((t) => t.trim()).join(' OR ');
    const max = inputData.maxPerSource;

    const [arxiv, scholar, hf] = await Promise.all([
      searchArxiv.execute({ query, maxResults: max, categories: ['cs.AI', 'cs.LG', 'cs.CL'] }),
      searchSemanticScholar.execute({ query, maxResults: max, minYear: new Date().getFullYear() }),
      searchHuggingFacePapers.execute({ query, limit: max }),
    ]);

    const rawContent = [
      '=== ARXIV ===',
      JSON.stringify(arxiv.papers.slice(0, max)),
      '=== SEMANTIC SCHOLAR ===',
      JSON.stringify(scholar.papers.slice(0, max)),
      '=== HUGGINGFACE PAPERS ===',
      JSON.stringify(hf.papers.slice(0, max)),
    ].join('\n\n');

    return { rawContent, recipientEmail: inputData.recipientEmail };
  },
});

// ─── Step 2: Summarize — one focused LLM call, no memory ────────────────────

const summarizePapersStep = createStep({
  id: 'summarize-papers',
  description: 'Ranks and summarises the top papers using a single focused LLM call',
  inputSchema: z.object({
    rawContent: z.string(),
    recipientEmail: z.string().optional(),
  }),
  outputSchema: z.object({
    summariesJson: z.string(),
    weekOf: z.string(),
    paperCount: z.number(),
    recipientEmail: z.string().optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('paperResearchAgent');
    if (!agent) throw new Error('paperResearchAgent not found');

    const response = await agent.generate(
      [{ role: 'user', content: `
You are given raw paper data from arxiv, Semantic Scholar, and HuggingFace.

${inputData.rawContent}

Tasks:
1. Deduplicate by title
2. Select the top 5-7 most impactful recent papers
3. Return ONLY this JSON (no markdown, no extra text):

{"summaries":[{"title":"...","authors":"Author One, Author Two","tldr":"One plain-English sentence","problem":"1-2 sentences","method":"2-3 sentences","results":"Benchmark numbers if available","whyItMatters":"1-2 sentences","tags":"tag1, tag2","url":"https://...","source":"arxiv"}]}
` }],
      { memoryOptions: { lastMessages: 0 } },  // skip memory — this is a one-shot task
    );

    let summariesJson = '[]';
    let paperCount = 0;
    try {
      const parsed = JSON.parse(response.text.trim()) as { summaries: unknown[] };
      summariesJson = JSON.stringify(parsed.summaries ?? []);
      paperCount = (parsed.summaries ?? []).length;
    } catch {
      summariesJson = '[]';
    }

    const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return { summariesJson, weekOf, paperCount, recipientEmail: inputData.recipientEmail };
  },
});

// ─── Step 3: Build HTML and send email ──────────────────────────────────────

const sendDigestStep = createStep({
  id: 'send-digest',
  description: 'Builds HTML digest and emails it',
  inputSchema: z.object({
    summariesJson: z.string(),
    weekOf: z.string(),
    paperCount: z.number(),
    recipientEmail: z.string().optional(),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    recipientCount: z.number(),
    paperCount: z.number(),
    digestSubject: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.paperCount === 0) {
      return { sent: false, recipientCount: 0, paperCount: 0, digestSubject: '' };
    }

    type PaperSummary = {
      title: string; authors: string; tldr: string; problem: string;
      method: string; results: string; whyItMatters: string; tags: string;
      url: string; source: string;
    };

    let summaries: PaperSummary[] = [];
    try { summaries = JSON.parse(inputData.summariesJson) as PaperSummary[]; } catch { summaries = []; }

    const subject = `AI Paper Digest — ${inputData.weekOf}`;

    const papersHtml = summaries.map((p, i) => `
<div style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
  <h2 style="margin:0 0 4px;font-size:18px;">
    ${i + 1}. <a href="${p.url}" style="color:#1d4ed8;text-decoration:none;">${p.title}</a>
  </h2>
  <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">${p.authors} · <em>${p.source}</em></p>
  <p style="margin:0 0 6px;"><strong>TL;DR:</strong> ${p.tldr}</p>
  <p style="margin:0 0 6px;"><strong>Problem:</strong> ${p.problem}</p>
  <p style="margin:0 0 6px;"><strong>Method:</strong> ${p.method}</p>
  <p style="margin:0 0 6px;"><strong>Results:</strong> ${p.results}</p>
  <p style="margin:0 0 6px;"><strong>Why it matters:</strong> ${p.whyItMatters}</p>
  <p style="margin:0;color:#6b7280;font-size:13px;">Tags: ${p.tags}</p>
</div>`).join('');

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:32px 16px;color:#111827;">
  <h1 style="font-size:24px;border-bottom:2px solid #111827;padding-bottom:12px;">🔬 AI Paper Digest</h1>
  <p style="color:#6b7280;">${inputData.weekOf} — ${summaries.length} papers from arxiv · Semantic Scholar · HuggingFace</p>
  ${papersHtml}
  <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;">
    Generated by <a href="https://github.com/iqrabismii/research-paper">Paper Read Agent</a>
  </p>
</body></html>`;

    const recipient = inputData.recipientEmail ?? process.env.DIGEST_TO_EMAIL ?? '';
    if (!recipient) return { sent: false, recipientCount: 0, paperCount: summaries.length, digestSubject: subject };

    const smtpReady = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!smtpReady) return { sent: false, recipientCount: 0, paperCount: summaries.length, digestSubject: subject };

    try {
      const transporter = createTransport();
      const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '';
      await transporter.sendMail({ from, to: recipient, subject, html: htmlBody });
      return { sent: true, recipientCount: 1, paperCount: summaries.length, digestSubject: subject };
    } catch {
      return { sent: false, recipientCount: 0, paperCount: summaries.length, digestSubject: subject };
    }
  },
});

// ─── Workflow assembly ───────────────────────────────────────────────────────

export const paperDigestWorkflow = createWorkflow({
  id: 'paper-digest-workflow',
  inputSchema: z.object({
    topics: z.string().default('large language models,reasoning,agents,multimodal'),
    maxPerSource: z.number().default(10),
    recipientEmail: z.string().optional().describe('Email to send digest to (falls back to DIGEST_TO_EMAIL env var)'),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    recipientCount: z.number(),
    paperCount: z.number(),
    digestSubject: z.string(),
  }),
})
  .then(fetchPapersStep)
  .then(summarizePapersStep)
  .then(sendDigestStep);

paperDigestWorkflow.commit();

export { paperDigestWorkflow as default };
