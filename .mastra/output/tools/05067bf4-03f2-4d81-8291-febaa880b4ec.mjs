import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const paperDetailsSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  publishedDate: z.string(),
  arxivUrl: z.string(),
  pdfUrl: z.string(),
  categories: z.array(z.string()),
  source: z.enum(["arxiv"])
});
const fetchPaperDetails = createTool({
  id: "fetch-paper-details",
  description: 'Fetch full metadata and abstract for a paper by its arxiv ID (e.g. "2312.01234" or "cs.AI/0601001").',
  inputSchema: z.object({
    arxivId: z.string().describe('ArXiv paper ID, e.g. "2312.01234"')
  }),
  outputSchema: paperDetailsSchema,
  mcp: {
    annotations: {
      title: "Fetch Paper Details",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true
    }
  },
  execute: async ({ arxivId }) => {
    const cleanId = arxivId.replace("https://arxiv.org/abs/", "").trim();
    const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(cleanId)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }
    const xml = await response.text();
    const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = xml.match(/<published>(.*?)<\/published>/);
    const idMatch = xml.match(/<id>(.*?)<\/id>/);
    const authorMatches = [...xml.matchAll(/<name>(.*?)<\/name>/g)];
    const categoryMatches = [...xml.matchAll(/term="([^"]+)"/g)];
    if (!titleMatch || !summaryMatch || !publishedMatch || !idMatch) {
      throw new Error(`Paper not found: ${cleanId}`);
    }
    return {
      id: cleanId,
      title: titleMatch[1].replace(/\s+/g, " ").trim(),
      authors: authorMatches.map((m) => m[1]),
      abstract: summaryMatch[1].replace(/\s+/g, " ").trim(),
      publishedDate: publishedMatch[1],
      arxivUrl: `https://arxiv.org/abs/${cleanId}`,
      pdfUrl: `https://arxiv.org/pdf/${cleanId}`,
      categories: categoryMatches.map((m) => m[1]).filter((c) => c.includes(".")),
      source: "arxiv"
    };
  }
});

export { fetchPaperDetails };
