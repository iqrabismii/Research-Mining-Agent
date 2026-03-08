import { statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function findRoot(dir: string): string {
  try {
    if (!dir.includes('.mastra') && statSync(path.join(dir, 'package.json')).isFile()) return dir;
  } catch {}
  const parent = path.dirname(dir);
  if (parent === dir) throw new Error('Could not find project root');
  return findRoot(parent);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = findRoot(__dirname);
