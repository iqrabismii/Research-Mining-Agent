import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../../workspace');

export const paperWorkspace = new Workspace({
  id: 'paper-research-workspace',
  name: 'Paper Research Workspace',
  filesystem: new LocalFilesystem({
    basePath: workspaceRoot,
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workspaceRoot,
  }),
  skills: ['/skills'],
  bm25: true,
});
