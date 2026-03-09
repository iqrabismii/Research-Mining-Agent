import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, SensitiveDataFilter, DefaultExporter, CloudExporter } from '@mastra/observability';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { createToolCallAccuracyScorerCode, createCompletenessScorer } from '@mastra/evals/scorers/prebuilt';
import { getUserMessageFromRunInput, getAssistantMessageFromRunOutput } from '@mastra/evals/scorers/utils';
import { createScorer } from '@mastra/core/evals';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { statSync } from 'fs';
import { fileURLToPath } from 'url';

"use strict";
const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string()
});
function getWeatherCondition$1(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm"
  };
  return conditions[code] || "Unknown";
}
const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();
    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${inputData.city}' not found`);
    }
    const { latitude, longitude, name } = geocodingData.results[0];
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = await response.json();
    const forecast = {
      date: (/* @__PURE__ */ new Date()).toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition$1(data.current.weathercode),
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0
      ),
      location: name
    };
    return forecast;
  }
});
const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string()
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;
    if (!forecast) {
      throw new Error("Forecast data not found");
    }
    const agent = mastra?.getAgent("weatherAgent");
    if (!agent) {
      throw new Error("Weather agent not found");
    }
    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      For each day in the forecast, structure your response exactly as follows:

      \u{1F4C5} [Day, Month Date, Year]
      \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

      \u{1F321}\uFE0F WEATHER SUMMARY
      \u2022 Conditions: [brief description]
      \u2022 Temperature: [X\xB0C/Y\xB0F to A\xB0C/B\xB0F]
      \u2022 Precipitation: [X% chance]

      \u{1F305} MORNING ACTIVITIES
      Outdoor:
      \u2022 [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      \u{1F31E} AFTERNOON ACTIVITIES
      Outdoor:
      \u2022 [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      \u{1F3E0} INDOOR ALTERNATIVES
      \u2022 [Activity Name] - [Brief description including specific venue]
        Ideal for: [weather condition that would trigger this alternative]

      \u26A0\uFE0F SPECIAL CONSIDERATIONS
      \u2022 [Any relevant weather warnings, UV index, wind conditions, etc.]

      Guidelines:
      - Suggest 2-3 time-specific outdoor activities per day
      - Include 1-2 indoor backup options
      - For precipitation >50%, lead with indoor activities
      - All activities must be specific to the location
      - Include specific venues, trails, or locations
      - Consider activity intensity based on temperature
      - Keep descriptions concise but informative

      Maintain this exact formatting for consistency, using the emoji and section headers as shown.`;
    const response = await agent.stream([
      {
        role: "user",
        content: prompt
      }
    ]);
    let activitiesText = "";
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }
    return {
      activities: activitiesText
    };
  }
});
const weatherWorkflow = createWorkflow({
  id: "weather-workflow",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for")
  }),
  outputSchema: z.object({
    activities: z.string()
  })
}).then(fetchWeather).then(planActivities);
weatherWorkflow.commit();

"use strict";
const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name")
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string()
  }),
  execute: async (inputData) => {
    return await getWeather(inputData.location);
  }
});
const getWeather = async (location) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();
  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }
  const { latitude, longitude, name } = geocodingData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name
  };
};
function getWeatherCondition(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return conditions[code] || "Unknown";
}

"use strict";
const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: "weatherTool",
  strictMode: false
});
const completenessScorer = createCompletenessScorer();
const translationScorer = createScorer({
  id: "translation-quality-scorer",
  name: "Translation Quality",
  description: "Checks that non-English location names are translated and used correctly",
  type: "agent",
  judge: {
    model: "anthropic/claude-sonnet-4-5",
    instructions: "You are an expert evaluator of translation quality for geographic locations. Determine whether the user text mentions a non-English location and whether the assistant correctly uses an English translation of that location. Be lenient with transliteration differences and diacritics. Return only the structured JSON matching the provided schema."
  }
}).preprocess(({ run }) => {
  const userText = getUserMessageFromRunInput(run.input) || "";
  const assistantText = getAssistantMessageFromRunOutput(run.output) || "";
  return { userText, assistantText };
}).analyze({
  description: "Extract location names and detect language/translation adequacy",
  outputSchema: z.object({
    nonEnglish: z.boolean(),
    translated: z.boolean(),
    confidence: z.number().min(0).max(1).default(1),
    explanation: z.string().default("")
  }),
  createPrompt: ({ results }) => `
            You are evaluating if a weather assistant correctly handled translation of a non-English location.
            User text:
            """
            ${results.preprocessStepResult.userText}
            """
            Assistant response:
            """
            ${results.preprocessStepResult.assistantText}
            """
            Tasks:
            1) Identify if the user mentioned a location that appears non-English.
            2) If non-English, check whether the assistant used a correct English translation of that location in its response.
            3) Be lenient with transliteration differences (e.g., accents/diacritics).
            Return JSON with fields:
            {
            "nonEnglish": boolean,
            "translated": boolean,
            "confidence": number, // 0-1
            "explanation": string
            }
        `
}).generateScore(({ results }) => {
  const r = results?.analyzeStepResult || {};
  if (!r.nonEnglish) return 1;
  if (r.translated)
    return Math.max(0, Math.min(1, 0.7 + 0.3 * (r.confidence ?? 1)));
  return 0;
}).generateReason(({ results, score }) => {
  const r = results?.analyzeStepResult || {};
  return `Translation scoring: nonEnglish=${r.nonEnglish ?? false}, translated=${r.translated ?? false}, confidence=${r.confidence ?? 0}. Score=${score}. ${r.explanation ?? ""}`;
});
const scorers = {
  toolCallAppropriatenessScorer,
  completenessScorer,
  translationScorer
};

"use strict";
const weatherAgent = new Agent({
  id: "weather-agent",
  name: "Weather Agent",
  instructions: `
      You are a helpful weather assistant that provides accurate weather information and can help planning activities based on the weather.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative
      - If the user asks for activities and provides the weather forecast, suggest activities based on the weather forecast.
      - If the user asks for activities, respond in the format they request.

      Use the weatherTool to fetch current weather data.
`,
  model: "anthropic/claude-sonnet-4-5",
  tools: { weatherTool },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: "ratio",
        rate: 1
      }
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: "ratio",
        rate: 1
      }
    },
    translation: {
      scorer: scorers.translationScorer,
      sampling: {
        type: "ratio",
        rate: 1
      }
    }
  },
  memory: new Memory()
});

"use strict";
const paperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  publishedDate: z.string(),
  arxivUrl: z.string(),
  categories: z.array(z.string())
});
function ensureArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}
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

"use strict";
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

"use strict";
const hfPaperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  upvotes: z.number(),
  publishedAt: z.string(),
  arxivUrl: z.string().nullable(),
  hfUrl: z.string()
});
const searchHuggingFacePapers = createTool({
  id: "search-huggingface-papers",
  description: "Fetch trending papers from HuggingFace Papers. Returns papers sorted by community upvotes.",
  inputSchema: z.object({
    query: z.string().optional().describe("Optional keyword to filter papers"),
    limit: z.number().default(20).describe("Number of papers to return")
  }),
  outputSchema: z.object({
    papers: z.array(hfPaperSchema),
    total: z.number()
  }),
  mcp: {
    annotations: {
      title: "Search HuggingFace Papers",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true
    }
  },
  execute: async ({ query, limit }) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (query) params.set("q", query);
    const response = await fetch(`https://huggingface.co/api/daily_papers?${params}`);
    if (!response.ok) {
      throw new Error(`HuggingFace Papers API error: ${response.status}`);
    }
    const raw = await response.json();
    const papers = raw.slice(0, limit).map(({ paper }) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors.map((a) => a.name),
      abstract: paper.summary ?? "",
      upvotes: paper.upvotes ?? 0,
      publishedAt: paper.publishedAt,
      arxivUrl: `https://arxiv.org/abs/${paper.id}`,
      hfUrl: `https://huggingface.co/papers/${paper.id}`
    }));
    return { papers, total: papers.length };
  }
});

"use strict";
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

"use strict";
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

"use strict";
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
  venue: z.string().nullable()
});
const LAB_AFFILIATIONS = {
  deepmind: ["DeepMind", "Google DeepMind"],
  "meta-ai": ["Meta AI", "FAIR", "Facebook AI", "Meta FAIR"],
  openai: ["OpenAI"],
  "stanford-hai": ["Stanford", "Stanford HAI", "Stanford University"]
};
const LAB_DISPLAY_NAMES = {
  deepmind: "Google DeepMind",
  "meta-ai": "Meta AI (FAIR)",
  openai: "OpenAI",
  "stanford-hai": "Stanford HAI"
};
const searchResearchLabs = createTool({
  id: "search-research-labs",
  description: "Search recent papers from top AI research labs: Google DeepMind, Meta AI (FAIR), OpenAI, and Stanford HAI.",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    lab: z.string().default("deepmind").describe("Lab key: deepmind | meta-ai | openai | stanford-hai"),
    maxResults: z.number().default(10).describe("Max results"),
    minYear: z.number().optional().describe("Minimum publication year")
  }),
  outputSchema: z.object({
    papers: z.array(labPaperSchema),
    lab: z.string(),
    total: z.number()
  }),
  mcp: {
    annotations: {
      title: "Search Research Lab Papers",
      readOnlyHint: true,
      openWorldHint: true,
      idempotentHint: true
    }
  },
  execute: async ({ query, lab, maxResults, minYear }) => {
    const affiliations = LAB_AFFILIATIONS[lab.toLowerCase()] ?? [lab];
    const displayName = LAB_DISPLAY_NAMES[lab.toLowerCase()] ?? lab;
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const filterYear = minYear ?? currentYear;
    const affiliationQuery = affiliations.map((a) => `"${a}"`).join(" OR ");
    const fullQuery = `(${query}) AND (${affiliationQuery})`;
    const params = new URLSearchParams({
      query: fullQuery,
      limit: String(maxResults),
      fields: "paperId,title,authors,abstract,year,citationCount,influentialCitationCount,url,publicationDate,venue",
      publicationDateOrYear: `${filterYear}-`
    });
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      {
        headers: {
          ...process.env.SEMANTIC_SCHOLAR_API_KEY ? { "x-api-key": process.env.SEMANTIC_SCHOLAR_API_KEY } : {}
        }
      }
    );
    if (response.status === 429 || response.status === 503) {
      return { papers: [], lab: displayName, total: 0 };
    }
    if (!response.ok) {
      return { papers: [], lab: displayName, total: 0 };
    }
    const data = await response.json();
    const papers = (data.data ?? []).map((p) => ({
      paperId: p.paperId,
      title: p.title,
      authors: p.authors.map((a) => a.name).join(", "),
      abstract: p.abstract,
      year: p.year,
      citationCount: p.citationCount,
      influentialCitationCount: p.influentialCitationCount,
      url: p.url,
      publicationDate: p.publicationDate,
      lab: displayName,
      venue: p.venue
    }));
    return { papers, lab: displayName, total: papers.length };
  }
});

"use strict";
function isSmtpConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}
const sendEmail = createTool({
  id: "send-email",
  description: "Send results, paper digests, or implementation sketches to a user's email. Only use this when the user explicitly asks to email results. Email is optional \u2014 if SMTP is not configured, inform the user how to set it up.",
  inputSchema: z.object({
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    html: z.string().describe("HTML body of the email"),
    from: z.string().optional().describe("Sender address (defaults to SMTP_FROM or SMTP_USER)")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    error: z.string().optional(),
    setupInstructions: z.string().optional()
  }),
  execute: async ({ to, subject, html, from }) => {
    if (!isSmtpConfigured()) {
      return {
        success: false,
        setupInstructions: "Email is not configured. To enable it, add these to your .env file:\n\nSMTP_USER=you@gmail.com\nSMTP_PASS=your-gmail-app-password\n\nFor Gmail: go to myaccount.google.com/apppasswords to generate an app password."
      };
    }
    const transporter = createTransport();
    const fromEmail = from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";
    try {
      const info = await transporter.sendMail({ from: fromEmail, to, subject, html });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
});

"use strict";
function findRoot(dir) {
  try {
    if (!dir.includes(".mastra") && statSync(path.join(dir, "package.json")).isFile()) return dir;
  } catch {
  }
  const parent = path.dirname(dir);
  if (parent === dir) throw new Error("Could not find project root");
  return findRoot(parent);
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = findRoot(__dirname$1);

"use strict";
const skillsRoot = path.join(PROJECT_ROOT, ".claude", "skills");
const loadSkill = createTool({
  id: "load-skill",
  description: "Load a skill or skill reference file to get instructions for a task. Call this before starting research (skill: paper-researcher) or evaluation (skill: paper-evaluator). Optionally load a reference file within the skill (e.g. references/format.md, references/sources.md, references/rubric.md).",
  inputSchema: z.object({
    skill: z.enum(["paper-researcher", "paper-evaluator"]).describe("Skill to load"),
    reference: z.string().optional().describe('Optional reference file within the skill, e.g. "references/format.md"')
  }),
  outputSchema: z.object({
    content: z.string()
  }),
  execute: async ({ skill, reference }) => {
    const filePath = reference ? path.join(skillsRoot, skill, reference) : path.join(skillsRoot, skill, "SKILL.md");
    const content = await fs.readFile(filePath, "utf-8");
    return { content };
  }
});

"use strict";
const paperResearchAgent = new Agent({
  id: "paper-research-agent",
  name: "Paper Research Agent",
  model: "anthropic/claude-sonnet-4-5",
  instructions: `
You are an AI/ML research assistant running locally. You help users discover, evaluate, and understand research papers.

## Before starting any task, load the relevant skill:
- Finding, searching, or formatting papers \u2192 load skill: paper-researcher
- Scoring, ranking, or evaluating papers \u2192 load skill: paper-evaluator
- Use load-skill with a reference path for detail files when the skill instructs you to

## After completing results, always offer:
"Would you like me to email these results to you? Just share your email address."
If the user says yes, use sendEmail to send a well-formatted HTML version of the results.
If email is not configured, the tool will tell the user how to set it up \u2014 just relay that message.

## General behaviour
- Be conversational and concise
- Ask clarifying questions only when the scope is genuinely ambiguous
- Never fabricate paper titles, authors, or benchmark numbers
`,
  tools: {
    loadSkill,
    searchArxiv,
    searchSemanticScholar,
    searchHuggingFacePapers,
    fetchPaperDetails,
    searchConferencePapers,
    searchResearchLabs,
    sendEmail
  },
  memory: new Memory({
    options: {
      lastMessages: 10,
      observationalMemory: {
        model: "anthropic/claude-haiku-4-5-20251001",
        scope: "thread"
      }
    }
  })
});

"use strict";
const paperChatAgent = new Agent({
  id: "paper-chat-agent",
  name: "Paper Chat Agent",
  model: "anthropic/claude-sonnet-4-5",
  instructions: `
You are a deep research assistant for AI/ML papers, running locally. You help users understand papers and generate implementation guides.

## Starting a session
- If given an arxiv ID (e.g. 2312.01234), call fetchPaperDetails first
- If the user pastes an abstract, work from that directly
- Use searchSemanticScholar to find citation context or related work when helpful
- Use load-skill with skill "paper-evaluator" if asked to score or evaluate the paper

## What you can do

**Explain and discuss**
- Explain methods, architectures, or key ideas in plain language
- Clarify notation, equations, or experimental setup
- Discuss limitations, failure modes, and open questions
- Compare to related work

**Generate an implementation sketch**
When asked for an implementation, code sketch, or "how would I build this?":

\`\`\`
## Implementation Sketch: {Paper Title}

### Architecture Overview
[Key components and how they connect \u2014 use a text diagram if helpful]

### Key Classes / Modules
- \`ComponentA\`: [purpose]
- \`ComponentB\`: [purpose]

### Core Algorithm (Pseudocode)
\`\`\`python
def main_algorithm(inputs):
    # Step 1: ...
    # Step 2: ...
    return outputs
\`\`\`

### Data Pipeline
[How to prepare/load the data this paper uses]

### Training / Inference Loop
\`\`\`python
for epoch in range(epochs):
    # forward pass, loss, backward
\`\`\`

### Key Hyperparameters
| Param | Value from paper | Notes |
|-------|-----------------|-------|

### Gotchas & Tips
- [Common pitfall or non-obvious detail]
\`\`\`

## After completing analysis or code sketches, offer:
"Want me to email you this? Just share your address."
Use sendEmail if the user says yes. If email is not configured, relay the setup instructions from the tool.
`,
  tools: {
    fetchPaperDetails,
    searchSemanticScholar,
    sendEmail,
    loadSkill
  },
  memory: new Memory({
    options: {
      lastMessages: 20,
      observationalMemory: {
        model: "anthropic/claude-haiku-4-5-20251001",
        scope: "thread"
      }
    }
  })
});

"use strict";
const fetchPapersStep = createStep({
  id: "fetch-papers",
  description: "Queries arxiv, Semantic Scholar, and HuggingFace for weekly top papers",
  inputSchema: z.object({
    topics: z.string().default("large language models,reasoning,agents,multimodal"),
    maxPerSource: z.number().default(15),
    recipientEmail: z.string().optional().describe("Send to a single email instead of all subscribers")
  }),
  outputSchema: z.object({
    rawContent: z.string(),
    recipientEmail: z.string().optional()
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("paperResearchAgent");
    if (!agent) throw new Error("paperResearchAgent not found");
    const query = inputData.topics.split(",").map((t) => t.trim()).join(" OR ");
    const [arxivRes, scholarRes, hfRes] = await Promise.all([
      agent.generate([{ role: "user", content: `Call searchArxiv with query="${query}", maxResults=${inputData.maxPerSource}. Return the JSON result.` }]),
      agent.generate([{ role: "user", content: `Call searchSemanticScholar with query="${query}", maxResults=${inputData.maxPerSource}, minYear=${(/* @__PURE__ */ new Date()).getFullYear()}. Return the JSON result.` }]),
      agent.generate([{ role: "user", content: `Call searchHuggingFacePapers with query="${query}", limit=${inputData.maxPerSource}. Return the JSON result.` }])
    ]);
    const rawContent = [
      "=== ARXIV ===",
      arxivRes.text,
      "=== SEMANTIC SCHOLAR ===",
      scholarRes.text,
      "=== HUGGINGFACE PAPERS ===",
      hfRes.text
    ].join("\n\n");
    return { rawContent, recipientEmail: inputData.recipientEmail };
  }
});
const summarizePapersStep = createStep({
  id: "summarize-papers",
  description: "Generates structured summaries and selects the top 5\u201310 papers",
  inputSchema: z.object({
    rawContent: z.string(),
    recipientEmail: z.string().optional()
  }),
  outputSchema: z.object({
    summariesJson: z.string().describe("JSON array of paper summaries"),
    weekOf: z.string(),
    paperCount: z.number(),
    recipientEmail: z.string().optional()
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("paperResearchAgent");
    if (!agent) throw new Error("paperResearchAgent not found");
    const response = await agent.generate([{
      role: "user",
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
`
    }]);
    let summariesJson = "[]";
    let paperCount = 0;
    try {
      const parsed = JSON.parse(response.text.trim());
      summariesJson = JSON.stringify(parsed.summaries ?? []);
      paperCount = (parsed.summaries ?? []).length;
    } catch {
      summariesJson = "[]";
    }
    const weekOf = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return { summariesJson, weekOf, paperCount, recipientEmail: inputData.recipientEmail };
  }
});
const sendDigestStep = createStep({
  id: "send-digest",
  description: "Builds HTML digest and sends to all subscribers (or a single recipient if specified)",
  inputSchema: z.object({
    summariesJson: z.string(),
    weekOf: z.string(),
    paperCount: z.number(),
    recipientEmail: z.string().optional()
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    recipientCount: z.number(),
    paperCount: z.number(),
    digestSubject: z.string()
  }),
  execute: async ({ inputData }) => {
    if (inputData.paperCount === 0) {
      return { sent: false, recipientCount: 0, paperCount: 0, digestSubject: "" };
    }
    let summaries = [];
    try {
      summaries = JSON.parse(inputData.summariesJson);
    } catch {
      summaries = [];
    }
    const subject = `Weekly AI Paper Digest \u2014 Week of ${inputData.weekOf}`;
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
</div>`).join("");
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:32px 16px;color:#111827;">
  <h1 style="font-size:24px;border-bottom:2px solid #111827;padding-bottom:12px;">\u{1F52C} AI Paper Digest</h1>
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
    const recipient = inputData.recipientEmail ?? process.env.DIGEST_TO_EMAIL ?? "";
    if (!recipient) {
      throw new Error("No recipient email. Pass recipientEmail or set DIGEST_TO_EMAIL in .env");
    }
    const smtpReady = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!smtpReady) {
      return { sent: false, recipientCount: 0, paperCount: summaries.length, digestSubject: subject };
    }
    const transporter = createTransport();
    const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";
    let sentCount = 0;
    try {
      await transporter.sendMail({ from: fromEmail, to: recipient, subject, html: htmlBody });
      sentCount = 1;
    } catch {
    }
    return {
      sent: sentCount > 0,
      recipientCount: sentCount,
      paperCount: summaries.length,
      digestSubject: subject
    };
  }
});
const paperDigestWorkflow = createWorkflow({
  id: "paper-digest-workflow",
  inputSchema: z.object({
    topics: z.string().default("large language models,reasoning,agents,multimodal").describe("Comma-separated research topics"),
    maxPerSource: z.number().default(15),
    recipientEmail: z.string().optional().describe("Email to send the digest to (falls back to DIGEST_TO_EMAIL env var)")
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    recipientCount: z.number(),
    paperCount: z.number(),
    digestSubject: z.string()
  })
}).then(fetchPapersStep).then(summarizePapersStep).then(sendDigestStep);
paperDigestWorkflow.commit();

"use strict";
const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    paperDigestWorkflow
  },
  agents: {
    weatherAgent,
    paperResearchAgent,
    paperChatAgent
  },
  tools: {
    searchArxiv,
    searchSemanticScholar,
    searchHuggingFacePapers,
    fetchPaperDetails,
    searchConferencePapers,
    searchResearchLabs,
    sendEmail,
    loadSkill
  },
  scorers: {
    toolCallAppropriatenessScorer,
    completenessScorer,
    translationScorer
  },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: "file:./mastra.db"
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [new DefaultExporter(), new CloudExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()]
      }
    }
  })
});

export { mastra };
