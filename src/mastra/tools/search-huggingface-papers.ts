import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const hfPaperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  upvotes: z.number(),
  publishedAt: z.string(),
  arxivUrl: z.string().nullable(),
  hfUrl: z.string(),
});

export type HFPaper = z.infer<typeof hfPaperSchema>;

export const searchHuggingFacePapers = createTool({
  id: 'search-huggingface-papers',
  description:
    'Fetch trending papers from HuggingFace Papers. Returns papers sorted by community upvotes.',
  inputSchema: z.object({
    query: z.string().optional().describe('Optional keyword to filter papers'),
    limit: z.number().default(20).describe('Number of papers to return'),
  }),
  outputSchema: z.object({
    papers: z.array(hfPaperSchema),
    total: z.number(),
  }),
  mcp: {
    annotations: {
      title: 'Search HuggingFace Papers',
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
  },
  execute: async ({ query, limit }) => {
    // HuggingFace daily papers API — the correct endpoint
    const params = new URLSearchParams({ limit: String(limit) });
    if (query) params.set('q', query);

    const response = await fetch(`https://huggingface.co/api/daily_papers?${params}`);
    if (!response.ok) {
      throw new Error(`HuggingFace Papers API error: ${response.status}`);
    }

    const raw = (await response.json()) as Array<{
      paper: {
        id: string;
        title: string;
        authors: Array<{ name: string }>;
        summary: string;
        upvotes: number;
        publishedAt: string;
      };
      publishedAt: string;
    }>;

    const papers: HFPaper[] = raw.slice(0, limit).map(({ paper }) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors.map((a) => a.name),
      abstract: paper.summary ?? '',
      upvotes: paper.upvotes ?? 0,
      publishedAt: paper.publishedAt,
      arxivUrl: `https://arxiv.org/abs/${paper.id}`,
      hfUrl: `https://huggingface.co/papers/${paper.id}`,
    }));

    return { papers, total: papers.length };
  },
});
