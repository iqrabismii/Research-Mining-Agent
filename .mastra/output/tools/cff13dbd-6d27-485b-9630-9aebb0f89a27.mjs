import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const paperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  publishedDate: z.string(),
  arxivUrl: z.string(),
  categories: z.array(z.string())
});
const searchArxiv = createTool({
  id: "search-arxiv",
  description: "Search arxiv for recent AI/ML papers by keyword and category. Returns papers from the past 7 days.",
  inputSchema: z.object({
    query: z.string().describe('Search query, e.g. "large language models reasoning"'),
    categories: z.string().default("cs.AI,cs.LG,cs.CL,stat.ML").describe('Comma-separated arxiv categories, e.g. "cs.AI,cs.LG,cs.CL,stat.ML"'),
    maxResults: z.number().default(20).describe("Maximum number of results")
  }),
  outputSchema: z.object({
    papers: z.array(paperSchema),
    total: z.number()
  }),
  mcp: {
    annotations: {
      title: "Search ArXiv Papers",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true
    }
  },
  execute: async ({ query, categories, maxResults }) => {
    const categoryFilter = categories.split(",").map((c) => `cat:${c.trim()}`).join(" OR ");
    const searchQuery = `(${query}) AND (${categoryFilter})`;
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(
      searchQuery
    )}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }
    const xml = await response.text();
    const papers = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      const authorMatches = [...entry.matchAll(/<name>(.*?)<\/name>/g)];
      const categoryMatches = [...entry.matchAll(/term="([^"]+)"/g)];
      if (!idMatch || !titleMatch || !summaryMatch || !publishedMatch) continue;
      const rawId = idMatch[1].trim();
      const arxivId = rawId.replace("http://arxiv.org/abs/", "");
      papers.push({
        id: arxivId,
        title: titleMatch[1].replace(/\s+/g, " ").trim(),
        authors: authorMatches.map((m) => m[1]),
        abstract: summaryMatch[1].replace(/\s+/g, " ").trim(),
        publishedDate: publishedMatch[1],
        arxivUrl: `https://arxiv.org/abs/${arxivId}`,
        categories: categoryMatches.map((m) => m[1]).filter((c) => c.includes("."))
      });
    }
    return { papers, total: papers.length };
  }
});

export { searchArxiv };
