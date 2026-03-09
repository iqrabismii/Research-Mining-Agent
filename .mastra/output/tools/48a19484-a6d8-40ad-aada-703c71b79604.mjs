import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const conferencePaperSchema = z.object({
  paperId: z.string(),
  title: z.string(),
  authors: z.string(),
  abstract: z.string().nullable(),
  year: z.number().nullable(),
  venue: z.string(),
  citationCount: z.number(),
  influentialCitationCount: z.number(),
  url: z.string(),
  publicationDate: z.string().nullable(),
  isOpenAccess: z.boolean().nullable()
});
const VENUE_MAP = {
  neurips: "NeurIPS",
  icml: "ICML",
  cvpr: "CVPR",
  iclr: "ICLR",
  aaai: "AAAI",
  "nature-mi": "Nature Machine Intelligence",
  tpami: "IEEE Transactions on Pattern Analysis and Machine Intelligence",
  tnnls: "IEEE Transactions on Neural Networks and Learning Systems",
  "ai-review": "Artificial Intelligence Review",
  jair: "Journal of Artificial Intelligence Research"
};
const searchConferencePapers = createTool({
  id: "search-conference-papers",
  description: "Search papers from top AI conferences (NeurIPS, ICML, CVPR, ICLR, AAAI) and journals (Nature MI, IEEE TPAMI, TNNLS, JAIR) via Semantic Scholar.",
  inputSchema: z.object({
    query: z.string().describe('Search query, e.g. "large language models reasoning"'),
    venue: z.string().default("neurips").describe(
      "Venue key: neurips | icml | cvpr | iclr | aaai | nature-mi | tpami | tnnls | jair"
    ),
    maxResults: z.number().default(15).describe("Max results to return"),
    year: z.number().optional().describe("Filter by year, e.g. 2024")
  }),
  outputSchema: z.object({
    papers: z.array(conferencePaperSchema),
    venue: z.string(),
    total: z.number()
  }),
  mcp: {
    annotations: {
      title: "Search Conference & Journal Papers",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true
    }
  },
  execute: async ({ query, venue, maxResults, year }) => {
    const venueName = VENUE_MAP[venue.toLowerCase()] ?? venue;
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const filterYear = year ?? currentYear;
    const params = new URLSearchParams({
      query: `${query} venue:${venueName}`,
      limit: String(maxResults),
      fields: "paperId,title,authors,abstract,year,venue,citationCount,influentialCitationCount,url,publicationDate,isOpenAccess",
      publicationDateOrYear: `${filterYear - 1}-`
    });
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      {
        headers: {
          ...process.env.SEMANTIC_SCHOLAR_API_KEY ? { "x-api-key": process.env.SEMANTIC_SCHOLAR_API_KEY } : {}
        }
      }
    );
    if (response.status === 429 || response.status === 503 || !response.ok) {
      return { papers: [], venue: venueName, total: 0 };
    }
    const data = await response.json();
    const papers = (data.data ?? []).filter((p) => p.venue?.toLowerCase().includes(venueName.toLowerCase().split(" ")[0].toLowerCase())).map((p) => ({
      paperId: p.paperId,
      title: p.title,
      authors: p.authors.map((a) => a.name).join(", "),
      abstract: p.abstract,
      year: p.year,
      venue: p.venue || venueName,
      citationCount: p.citationCount,
      influentialCitationCount: p.influentialCitationCount,
      url: p.url,
      publicationDate: p.publicationDate,
      isOpenAccess: p.isOpenAccess
    }));
    return { papers, venue: venueName, total: papers.length };
  }
});

export { searchConferencePapers };
