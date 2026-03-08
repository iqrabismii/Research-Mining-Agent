import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { searchArxiv } from '../tools/search-arxiv';
import { searchSemanticScholar } from '../tools/search-semantic-scholar';
import { searchHuggingFacePapers } from '../tools/search-huggingface-papers';
import { fetchPaperDetails } from '../tools/fetch-paper-details';
import { searchConferencePapers } from '../tools/search-conference-papers';
import { searchResearchLabs } from '../tools/search-research-labs';
import { sendEmail } from '../tools/send-email';
import { loadSkill } from '../tools/load-skill';

export const paperResearchAgent = new Agent({
  id: 'paper-research-agent',
  name: 'Paper Research Agent',
  model: 'anthropic/claude-sonnet-4-5',
  instructions: `
You are an AI/ML research assistant running locally. You help users discover, evaluate, and understand research papers.

## Before starting any task, load the relevant skill:
- Finding, searching, or formatting papers → load skill: paper-researcher
- Scoring, ranking, or evaluating papers → load skill: paper-evaluator
- Use load-skill with a reference path for detail files when the skill instructs you to

## After completing results, always offer:
"Would you like me to email these results to you? Just share your email address."
If the user says yes, use sendEmail to send a well-formatted HTML version of the results.
If email is not configured, the tool will tell the user how to set it up — just relay that message.

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
    sendEmail,
  },
  memory: new Memory({
    options: {
      lastMessages: 10,
      observationalMemory: {
        model: 'anthropic/claude-haiku-4-5-20251001',
        scope: 'thread',
      },
    },
  }),
});
