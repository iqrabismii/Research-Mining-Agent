import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const labPaperSchema = z.object({
  paperId: z.string(),
  title: z.string(),
  authors: z.string(),
  abstract: z.string().nullable(),
  year: z.number().nullable(),
  citationCount: z.number(),
  influentialCitationCount: z.number(),
  url: z.string(),
  publicationDate: z.string().nullable(),
  lab: z.string(),
  venue: z.string().nullable(),
});

export type LabPaper = z.infer<typeof labPaperSchema>;

// Affiliation keywords for each lab used to filter Semantic Scholar results
const LAB_AFFILIATIONS: Record<string, string[]> = {
  deepmind: ['DeepMind', 'Google DeepMind'],
  'meta-ai': ['Meta AI', 'FAIR', 'Facebook AI', 'Meta FAIR'],
  openai: ['OpenAI'],
  'stanford-hai': ['Stanford', 'Stanford HAI', 'Stanford University'],
};

const LAB_DISPLAY_NAMES: Record<string, string> = {
  deepmind: 'Google DeepMind',
  'meta-ai': 'Meta AI (FAIR)',
  openai: 'OpenAI',
  'stanford-hai': 'Stanford HAI',
};

export const searchResearchLabs = createTool({
  id: 'search-research-labs',
  description:
    'Search recent papers from top AI research labs: Google DeepMind, Meta AI (FAIR), OpenAI, and Stanford HAI.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    lab: z
      .string()
      .default('deepmind')
      .describe('Lab key: deepmind | meta-ai | openai | stanford-hai'),
    maxResults: z.number().default(10).describe('Max results'),
    minYear: z.number().optional().describe('Minimum publication year'),
  }),
  outputSchema: z.object({
    papers: z.array(labPaperSchema),
    lab: z.string(),
    total: z.number(),
  }),
  mcp: {
    annotations: {
      title: 'Search Research Lab Papers',
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true,
    },
  },
  execute: async ({ query, lab, maxResults, minYear }) => {
    const affiliations = LAB_AFFILIATIONS[lab.toLowerCase()] ?? [lab];
    const displayName = LAB_DISPLAY_NAMES[lab.toLowerCase()] ?? lab;
    const currentYear = new Date().getFullYear();
    const filterYear = minYear ?? currentYear;

    // Search with affiliation filter appended to query
    const affiliationQuery = affiliations.map((a) => `"${a}"`).join(' OR ');
    const fullQuery = `(${query}) AND (${affiliationQuery})`;

    const params = new URLSearchParams({
      query: fullQuery,
      limit: String(maxResults),
      fields:
        'paperId,title,authors,abstract,year,citationCount,influentialCitationCount,url,publicationDate,venue',
      publicationDateOrYear: `${filterYear}-`,
    });

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      {
        headers: {
          ...(process.env.SEMANTIC_SCHOLAR_API_KEY
            ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY }
            : {}),
        },
      },
    );

    if (response.status === 429 || response.status === 503) {
      return { papers: [], lab: displayName, total: 0 };
    }
    if (!response.ok) {
      return { papers: [], lab: displayName, total: 0 };
    }

    const data = (await response.json()) as {
      data: Array<{
        paperId: string;
        title: string;
        authors: Array<{ name: string }>;
        abstract: string | null;
        year: number | null;
        citationCount: number;
        influentialCitationCount: number;
        url: string;
        publicationDate: string | null;
        venue: string | null;
      }>;
      total: number;
    };

    const papers: LabPaper[] = (data.data ?? []).map((p) => ({
      paperId: p.paperId,
      title: p.title,
      authors: p.authors.map((a) => a.name).join(', '),
      abstract: p.abstract,
      year: p.year,
      citationCount: p.citationCount,
      influentialCitationCount: p.influentialCitationCount,
      url: p.url,
      publicationDate: p.publicationDate,
      lab: displayName,
      venue: p.venue,
    }));

    return { papers, lab: displayName, total: papers.length };
  },
});
