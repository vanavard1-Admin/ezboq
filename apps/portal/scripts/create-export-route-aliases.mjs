import fs from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const exportRoot = path.join(workspaceRoot, 'out');
const SKIP_BASENAMES = new Set(['index.html', '404.html', '_not-found.html']);

async function ensureFile(filePath) {
  const stat = await fs.stat(filePath).catch(() => null);
  return stat?.isFile() === true;
}

async function walk(dirPath, htmlFiles = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(absolutePath, htmlFiles);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(absolutePath);
    }
  }

  return htmlFiles;
}

async function main() {
  if (!(await ensureFile(path.join(exportRoot, 'index.html')))) {
    throw new Error(`Static export not found at ${exportRoot}`);
  }

  const htmlFiles = await walk(exportRoot);
  let aliasCount = 0;

  for (const sourceFile of htmlFiles) {
    const basename = path.basename(sourceFile);
    if (SKIP_BASENAMES.has(basename)) continue;

    const relativeHtmlPath = path.relative(exportRoot, sourceFile);
    const routeDir = relativeHtmlPath.slice(0, -'.html'.length);
    if (!routeDir) continue;

    const aliasFile = path.join(exportRoot, routeDir, 'index.html');
    if (sourceFile === aliasFile) continue;

    await fs.mkdir(path.dirname(aliasFile), { recursive: true });
    await fs.copyFile(sourceFile, aliasFile);
    aliasCount += 1;
  }

  console.log(`[create-export-route-aliases] created ${aliasCount} route aliases in ${exportRoot}`);
}

main().catch((error) => {
  console.error('[create-export-route-aliases] failed:', error);
  process.exitCode = 1;
});
