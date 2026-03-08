import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { PROJECT_ROOT } from '../utils/project-root';

const skillsRoot = path.join(PROJECT_ROOT, '.claude', 'skills');

export const loadSkill = createTool({
  id: 'load-skill',
  description:
    'Load a skill or skill reference file to get instructions for a task. ' +
    'Call this before starting research (skill: paper-researcher) or evaluation (skill: paper-evaluator). ' +
    'Optionally load a reference file within the skill (e.g. references/format.md, references/sources.md, references/rubric.md).',
  inputSchema: z.object({
    skill: z.enum(['paper-researcher', 'paper-evaluator']).describe('Skill to load'),
    reference: z
      .string()
      .optional()
      .describe('Optional reference file within the skill, e.g. "references/format.md"'),
  }),
  outputSchema: z.object({
    content: z.string(),
  }),
  execute: async ({ skill, reference }) => {
    const filePath = reference
      ? path.join(skillsRoot, skill, reference)
      : path.join(skillsRoot, skill, 'SKILL.md');

    const content = await fs.readFile(filePath, 'utf-8');
    return { content };
  },
});
