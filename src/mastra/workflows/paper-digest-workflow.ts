import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { createTransport } from '../tools/send-email';

// ─── Step 1: Fetch papers from all sources ─────────────────────────────────

const fetchPapersStep = createStep({
  id: 'fetch-papers',
  description: 'Queries arxiv, Semantic Scholar, and HuggingFace for weekly top papers',
  inputSchema: z.object({
    topics: z.string().default('large language models,reasoning,agents,multimodal'),
    maxPerSource: z.number().default(15),
    recipientEmail: z.string().optional().describe('Send to a single email instead of all subscribers'),
  }),
  outputSchema: z.object({
    rawContent: z.string(),
    recipientEmail: z.string().optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('paperResearchAgent');
    if (!agent) throw new Error('paperResearchAgent not found');

    const query = inputData.topics
      .split(',')
      .map((t) => t.trim())
      .join(' OR ');

    const [arxivRes, scholarRes, hfRes] = await Promise.all([
      agent.generate([{ role: 'user', content: `Call searchArxiv with query="${query}", maxResults=${inputData.maxPerSource}. Return the JSON result.` }]),
      agent.generate([{ role: 'user', content: `Call searchSemanticScholar with query="${query}", maxResults=${inputData.maxPerSource}, minYear=${new Date().getFullYear()}. Return the JSON result.` }]),
      agent.generate([{ role: 'user', content: `Call searchHuggingFacePapers with query="${query}", limit=${inputData.maxPerSource}. Return the JSON result.` }]),
    ]);

    const rawContent = [
      '=== ARXIV ===', arxivRes.text,
      '=== SEMANTIC SCHOLAR ===', scholarRes.text,
      '=== HUGGINGFACE PAPERS ===', hfRes.text,
    ].join('\n\n');

    return { rawContent, recipientEmail: inputData.recipientEmail };
  },
});

// ─── Step 2: Summarize and rank ─────────────────────────────────────────────

const summarizePapersStep = createStep({
  id: 'summarize-papers',
  description: 'Generates structured summaries and selects the top 5–10 papers',
  inputSchema: z.object({
    rawContent: z.string(),
    recipientEmail: z.string().optional(),
  }),
  outputSchema: z.object({
    summariesJson: z.string().describe('JSON array of paper summaries'),
    weekOf: z.string(),
    paperCount: z.number(),
    recipientEmail: z.string().optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('paperResearchAgent');
    if (!agent) throw new Error('paperResearchAgent not found');

    const response = await agent.generate([{
      role: 'user',
      content: `
Here is raw output from three paper search sources (arxiv, Semantic Scholar, HuggingFace):

${inputData.rawContent}

Based on these results:
1. Deduplicate papers by title
2. Select the top 5-10 most impactful papers from the past 7 days
3. For each paper produce a structured summary in this exact JSON format:

{
  "summaries": [
    {
      "title": "...",
      "authors": "Author One, Author Two",
      "tldr": "One plain-English sentence summary",
      "problem": "What challenge it addresses",
      "method": "Key idea in 2-3 sentences",
      "results": "Headline benchmark numbers or qualitative claims",
      "whyItMatters": "Impact on the field",
      "tags": "LLM, Reasoning, Efficiency",
      "url": "https://arxiv.org/abs/...",
      "source": "arxiv"
    }
  ]
}

Return ONLY valid JSON, no markdown fences, no extra text.
`,
    }]);

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

// ─── Step 3: Build HTML and broadcast to subscribers ────────────────────────

const sendDigestStep = createStep({
  id: 'send-digest',
  description: 'Builds HTML digest and sends to all subscribers (or a single recipient if specified)',
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

    const subject = `Weekly AI Paper Digest — Week of ${inputData.weekOf}`;

    const papersHtml = summaries.map((p, i) => `
<div style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
  <h2 style="margin:0 0 4px;font-size:18px;">
    ${i + 1}. <a href="${p.url}" style="color:#1d4ed8;text-decoration:none;">${p.title}</a>
  </h2>
  <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">${p.authors} &middot; <em>${p.source}</em></p>
  <p style="margin:0 0 6px;"><strong>TL;DR:</strong> ${p.tldr}</p>
  <p style="margin:0 0 6px;"><strong>Problem:</strong> ${p.problem}</p>
  <p style="margin:0 0 6px;"><strong>Method:</strong> ${p.method}</p>
  <p style="margin:0 0 6px;"><strong>Results:</strong> ${p.results}</p>
  <p style="margin:0 0 6px;"><strong>Why it matters:</strong> ${p.whyItMatters}</p>
  <p style="margin:0;color:#6b7280;font-size:13px;">Tags: ${p.tags}</p>
</div>`).join('');

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:32px 16px;color:#111827;">
  <h1 style="font-size:24px;border-bottom:2px solid #111827;padding-bottom:12px;">🔬 AI Paper Digest</h1>
  <p style="color:#6b7280;">Week of ${inputData.weekOf} &mdash; ${summaries.length} papers curated from arxiv, Semantic Scholar &amp; HuggingFace</p>
  ${papersHtml}
  <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;">
    Generated by <a href="https://github.com/iqrabismii/research-paper">Paper Read Agent</a> &middot;
    <a href="https://arxiv.org">arxiv</a> &middot;
    <a href="https://semanticscholar.org">Semantic Scholar</a> &middot;
    <a href="https://huggingface.co/papers">HuggingFace Papers</a>
  </p>
</body>
</html>`;

    const recipient = inputData.recipientEmail ?? process.env.DIGEST_TO_EMAIL ?? '';
    if (!recipient) {
      throw new Error('No recipient email. Pass recipientEmail or set DIGEST_TO_EMAIL in .env');
    }

    const smtpReady = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!smtpReady) {
      return { sent: false, recipientCount: 0, paperCount: summaries.length, digestSubject: subject };
    }

    const transporter = createTransport();
    const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '';

    let sentCount = 0;
    try {
      await transporter.sendMail({ from: fromEmail, to: recipient, subject, html: htmlBody });
      sentCount = 1;
    } catch {
      // fall through — sentCount stays 0
      }
    }

    return {
      sent: sentCount > 0,
      recipientCount: sentCount,
      paperCount: summaries.length,
      digestSubject: subject,
    };
  },
});

// ─── Workflow assembly ───────────────────────────────────────────────────────

export const paperDigestWorkflow = createWorkflow({
  id: 'paper-digest-workflow',
  inputSchema: z.object({
    topics: z.string().default('large language models,reasoning,agents,multimodal').describe('Comma-separated research topics'),
    maxPerSource: z.number().default(15),
    recipientEmail: z.string().optional().describe('Email to send the digest to (falls back to DIGEST_TO_EMAIL env var)'),
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
