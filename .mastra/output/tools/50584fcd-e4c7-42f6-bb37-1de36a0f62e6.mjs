import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const scholarPaperSchema = z.object({
  paperId: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string().nullable(),
  year: z.number().nullable(),
  citationCount: z.number(),
  influentialCitationCount: z.number(),
  url: z.string(),
  fieldsOfStudy: z.array(z.string()),
  publicationDate: z.string().nullable()
});
const searchSemanticScholar = createTool({
  id: "search-semantic-scholar",
  description: "Search Semantic Scholar for trending and highly cited recent AI/ML papers from the past 7 days.",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    maxResults: z.number().default(20).describe("Maximum number of results"),
    minYear: z.number().optional().describe("Minimum publication year (e.g. 2025)")
  }),
  outputSchema: z.object({
    papers: z.array(scholarPaperSchema),
    total: z.number()
  }),
  mcp: {
    annotations: {
      title: "Search Semantic Scholar",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true
    }
  },
  execute: async ({ query, maxResults, minYear }) => {
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const yearFilter = minYear ?? currentYear;
    const params = new URLSearchParams({
      query,
      limit: String(maxResults),
      fields: "paperId,title,authors,abstract,year,citationCount,influentialCitationCount,url,fieldsOfStudy,publicationDate",
      publicationDateOrYear: `${yearFilter}-`
    });
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...process.env.SEMANTIC_SCHOLAR_API_KEY ? { "x-api-key": process.env.SEMANTIC_SCHOLAR_API_KEY } : {}
        }
      }
    );
    if (response.status === 429 || response.status === 503) {
      return { papers: [], total: 0 };
    }
    if (!response.ok) {
      return { papers: [], total: 0 };
    }
    const data = await response.json();
    const papers = (data.data ?? []).map((p) => ({
      paperId: p.paperId,
      title: p.title,
      authors: p.authors.map((a) => a.name),
      abstract: p.abstract,
      year: p.year,
      citationCount: p.citationCount,
      influentialCitationCount: p.influentialCitationCount,
      url: p.url,
      fieldsOfStudy: p.fieldsOfStudy ?? [],
      publicationDate: p.publicationDate
    }));
    return { papers, total: data.total ?? papers.length };
  }
});

export { searchSemanticScholar };
