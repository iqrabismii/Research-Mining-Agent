import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { paperResearchAgent } from './agents/paper-research-agent';
import { paperChatAgent } from './agents/paper-chat-agent';
import { paperDigestWorkflow } from './workflows/paper-digest-workflow';
import { searchArxiv } from './tools/search-arxiv';
import { searchSemanticScholar } from './tools/search-semantic-scholar';
import { searchHuggingFacePapers } from './tools/search-huggingface-papers';
import { fetchPaperDetails } from './tools/fetch-paper-details';
import { searchConferencePapers } from './tools/search-conference-papers';
import { searchResearchLabs } from './tools/search-research-labs';
import { sendEmail } from './tools/send-email';
import { loadSkill } from './tools/load-skill';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, paperDigestWorkflow },
  agents: { weatherAgent, paperResearchAgent, paperChatAgent },
  tools: {
    searchArxiv,
    searchSemanticScholar,
    searchHuggingFacePapers,
    fetchPaperDetails,
    searchConferencePapers,
    searchResearchLabs,
    sendEmail,
    loadSkill,
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db',
  }),
  logger: new PinoLogger({ name: 'Mastra', level: 'info' }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [new DefaultExporter(), new CloudExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
