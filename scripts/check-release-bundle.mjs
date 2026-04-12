import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const buildDir = path.resolve(workspaceRoot, 'build');
const sourceDir = path.resolve(workspaceRoot, 'src');
const blockedTokens = [
  'owner@vanavard.local',
  'pm@vanavard.local',
  'client@vanavard.local',
  'YOO LAEW RUAY MAI',
  'song141@gmail.com',
  'PYvi3VTscOfh83McWIQ3cU05n1l1',
  'renovate-dormitory-nakhonpathom-v2',
];
const buildOnlyBlockedTokens = [
  'owner@demo.ezboq.local',
  'pm@demo.ezboq.local',
  'client@demo.ezboq.local',
  'EzBOQ Demo',
  'EzBOQ Demo Client',
];
const buildOnlyBlockedPatterns = [
  /workspaceMode["':\s]+mock/iu,
  /mockUsers/iu,
  /VITE_ENABLE_MOCK_AUTH["':\s]+true/iu,
];

async function collectFiles(dir, pattern) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath, pattern);
    }

    if (!pattern.test(entry.name)) {
      return [];
    }

    return [fullPath];
  }));

  return files.flat();
}

async function main() {
  const files = await collectFiles(buildDir, /\.(html|css|js)$/u);
  const sourceFiles = await collectFiles(sourceDir, /\.(ts|tsx|js|mjs)$/u);
  const violations = [];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const token of blockedTokens) {
      if (content.includes(token)) {
        violations.push(`${token} -> ${path.relative(workspaceRoot, file)}`);
      }
    }
    for (const token of buildOnlyBlockedTokens) {
      if (content.includes(token)) {
        violations.push(`build token ${token} -> ${path.relative(workspaceRoot, file)}`);
      }
    }
    for (const pattern of buildOnlyBlockedPatterns) {
      if (pattern.test(content)) {
        violations.push(`build pattern ${pattern} -> ${path.relative(workspaceRoot, file)}`);
      }
    }
  }

  for (const file of sourceFiles) {
    const content = await readFile(file, 'utf8');
    for (const token of blockedTokens) {
      if (content.includes(token)) {
        violations.push(`source token ${token} -> ${path.relative(workspaceRoot, file)}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error('Blocked release tokens found in build output:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log('Release bundle check passed.');
}

await main();
