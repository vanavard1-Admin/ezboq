/**
 * 💎 Gemma Discord Bot — Research & Self-Upgrade Module
 * ค้นหาข้อมูลจากเว็บ + อ่าน/แก้ไขตัวเอง
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, relative, extname, isAbsolute, basename } from 'path';
import { fileURLToPath } from 'url';
import * as mem from './memory.mjs';
import { SPECIALISTS } from './secretary.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', '.cache', 'coverage', 'tmp', 'temp']);
const READABLE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt',
  '.lua', '.luau', '.css', '.scss', '.html', '.sql', '.yaml', '.yml',
]);
const MAX_PROJECT_FILE_BYTES = 256 * 1024;

const PROJECT_SURFACES = {
  self: {
    key: 'self',
    name: 'Gemma Runtime',
    root: __dirname,
    description: 'source code ของ Gemma เอง',
  },
  ...Object.fromEntries(
    Object.entries(SPECIALISTS).map(([key, spec]) => [
      key,
      {
        key,
        name: spec.nameTh || spec.name || key,
        root: spec.projectPath,
        description: spec.description || '',
      },
    ]),
  ),
};

function getProjectSurface(project = 'ezboq') {
  return PROJECT_SURFACES[String(project || 'ezboq').trim().toLowerCase()] || null;
}

function isPathInsideRoot(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function normalizeProjectTargetPath(root, targetPath = '') {
  const raw = String(targetPath || '').trim().replace(/\\/g, '/');
  if (!raw || raw === '.' || raw === './' || raw === '/') {
    return resolve(root);
  }

  if (isAbsolute(raw)) {
    return isPathInsideRoot(root, raw)
      ? resolve(raw)
      : resolve(root, raw.replace(/^\/+/, ''));
  }

  return resolve(root, raw.replace(/^\.\//, ''));
}

function resolveProjectPath(project, targetPath = '') {
  const surface = getProjectSurface(project);
  if (!surface?.root) {
    return { error: `ไม่รู้จัก project: ${project}` };
  }

  const root = resolve(surface.root);
  if (!existsSync(root)) {
    return { error: `project root ใช้งานไม่ได้: ${surface.key} -> ${root}` };
  }

  const absolutePath = normalizeProjectTargetPath(root, targetPath);
  if (!isPathInsideRoot(root, absolutePath)) {
    return { error: 'path อยู่นอก project ที่อนุญาต' };
  }

  return { surface, root, absolutePath };
}

function shouldReadProjectFile(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (!READABLE_EXTENSIONS.has(extension)) return false;
  try {
    const stats = statSync(filePath);
    return stats.isFile() && stats.size <= MAX_PROJECT_FILE_BYTES;
  } catch {
    return false;
  }
}

function shouldSearchProjectFile(filePath) {
  if (!shouldReadProjectFile(filePath)) return false;

  const filename = basename(filePath).toLowerCase();
  if (filename === 'package-lock.json' || filename.endsWith('.backup') || filename.endsWith('.bak')) {
    return false;
  }

  return true;
}

function scoreProjectEntryForSearch(entryPath = '', needle = '') {
  const normalizedPath = String(entryPath || '').toLowerCase();
  const filename = basename(normalizedPath);
  let score = 0;

  if (needle && normalizedPath.includes(needle)) score += 120;
  if (needle && filename.includes(needle)) score += 80;
  if (/\/(src|app|apps|functions|shared|lib|components)\//.test(normalizedPath)) score += 35;
  if (/\/(docs|assets|examples)\//.test(normalizedPath)) score -= 15;
  if (/readme|vision|package\.json/.test(filename)) score -= 10;

  const ext = extname(normalizedPath);
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) score += 20;
  if (['.md', '.json', '.txt'].includes(ext)) score += 5;

  return score;
}

function walkProjectFiles(root, {
  currentDir = root,
  depth = 0,
  maxDepth = 4,
  results = [],
  maxResults = 200,
} = {}) {
  if (depth > maxDepth || results.length >= maxResults) return results;

  let entries = [];
  try {
    entries = readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (results.length >= maxResults) break;
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

    const fullPath = resolve(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (PROJECT_SKIP_DIRS.has(entry.name)) continue;
      walkProjectFiles(root, {
        currentDir: fullPath,
        depth: depth + 1,
        maxDepth,
        results,
        maxResults,
      });
      continue;
    }

    if (shouldReadProjectFile(fullPath)) {
      results.push({
        path: relative(root, fullPath),
        ext: extname(fullPath).toLowerCase(),
      });
    }
  }

  return results;
}

// ─── Web Search (DuckDuckGo) ─────────────────────
export async function webSearch(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GemmaBot/2.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { error: `Search failed: ${res.status}` };

    const data = await res.json();
    const results = [];

    // Abstract (main answer)
    if (data.Abstract) {
      results.push({ title: data.Heading || 'Answer', text: data.Abstract, url: data.AbstractURL });
    }

    // Related topics
    if (data.RelatedTopics?.length > 0) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results.push({ title: topic.Text.slice(0, 80), text: topic.Text, url: topic.FirstURL });
        }
      }
    }

    // Infobox
    if (data.Infobox?.content?.length > 0) {
      const info = data.Infobox.content
        .slice(0, 5)
        .map(c => `${c.label}: ${c.value}`)
        .join('\n');
      results.push({ title: 'Info', text: info });
    }

    if (results.length === 0) {
      // Fallback: try HTML scrape for better results
      return await webSearchHTML(query);
    }

    // Self-learning: store useful search results in knowledge table
    if (results.length > 0 && results[0].text?.length > 20) {
      try {
        const summary = results.slice(0, 3).map(r => r.text).join(' | ').slice(0, 500);
        mem.addKnowledge(`search: ${query.slice(0, 80)}`, summary, 'web_search', 'gemma');
      } catch { /* ignore if knowledge table not ready */ }
    }

    return { query, results, count: results.length };
  } catch (err) {
    return { error: `Search error: ${err.message}` };
  }
}

// HTML search fallback for better results
async function webSearchHTML(query) {
  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GemmaBot/2.0' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    // Extract result snippets from lite HTML
    const results = [];
    const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    const links = [];
    while ((match = linkRegex.exec(html)) !== null && links.length < 5) {
      links.push({ url: match[1], title: match[2].replace(/<[^>]+>/g, '').trim() });
    }

    const snippets = [];
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
    }

    for (let i = 0; i < Math.min(links.length, 5); i++) {
      results.push({
        title: links[i]?.title || `Result ${i + 1}`,
        text: snippets[i] || '',
        url: links[i]?.url || '',
      });
    }

    return { query, results, count: results.length };
  } catch (err) {
    return { error: `HTML search error: ${err.message}`, query };
  }
}

// ─── Web Fetch (Extract text from URL) ───────────
export async function webFetch(url, maxChars = 3000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GemmaBot/2.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { error: `Fetch failed: ${res.status}` };

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await res.json();
      return { url, type: 'json', content: JSON.stringify(json, null, 2).slice(0, maxChars) };
    }

    const html = await res.text();
    // Strip HTML tags and extract text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
      .slice(0, maxChars);

    return { url, type: 'html', content: text, length: text.length };
  } catch (err) {
    return { error: `Fetch error: ${err.message}`, url };
  }
}

// ─── Self-Read (Read own source files) ───────────
const READABLE_FILES = ['bot.mjs', 'config.mjs', 'soul.mjs', 'tools.mjs', 'memory.mjs', 'skills.mjs', 'research.mjs', 'agents.mjs', 'rag.mjs', 'secretary.mjs', 'cron.mjs', 'evolution.mjs', 'training.mjs', 'workflows.mjs', 'logger.mjs', 'eval.mjs', 'package.json'];

export function readOwnFile(filename) {
  if (!READABLE_FILES.includes(filename)) {
    return { error: `Cannot read '${filename}'. Allowed: ${READABLE_FILES.join(', ')}` };
  }
  try {
    const filepath = resolve(__dirname, filename);
    if (!existsSync(filepath)) return { error: `File not found: ${filename}` };
    const content = readFileSync(filepath, 'utf-8');
    return { file: filename, content: content.slice(0, 4000), lines: content.split('\n').length };
  } catch (err) {
    return { error: `Read error: ${err.message}` };
  }
}

export function listProjectFiles(project = 'ezboq', path = '', depth = 3, maxResults = 80) {
  const resolved = resolveProjectPath(project, path);
  if (resolved.error) return { error: resolved.error };

  const { surface, root, absolutePath } = resolved;
  if (!existsSync(absolutePath)) {
    return { error: `ไม่พบ path: ${path || '.'}`, project: surface.key };
  }

  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    return {
      project: surface.key,
      projectName: surface.name,
      root,
      path: relative(root, absolutePath) || '.',
      entries: [{ path: relative(root, absolutePath) || '.', ext: extname(absolutePath).toLowerCase() }],
      count: 1,
    };
  }

  const entries = walkProjectFiles(root, {
    currentDir: absolutePath,
    maxDepth: Math.max(0, Number(depth) || 0),
    maxResults: Math.max(1, Math.min(Number(maxResults) || 80, 200)),
  });

  return {
    project: surface.key,
    projectName: surface.name,
    root,
    path: relative(root, absolutePath) || '.',
    entries,
    count: entries.length,
  };
}

export function readProjectFile(project = 'ezboq', filePath = '', startLine = 1, maxLines = 120) {
  const resolved = resolveProjectPath(project, filePath);
  if (resolved.error) return { error: resolved.error };

  const { surface, root, absolutePath } = resolved;
  if (!existsSync(absolutePath)) {
    return { error: `ไม่พบไฟล์: ${filePath}`, project: surface.key };
  }

  if (!shouldReadProjectFile(absolutePath)) {
    return { error: 'ไฟล์นี้ไม่อยู่ในชนิด/ขนาดที่อนุญาตให้อ่านผ่าน tool นี้', project: surface.key };
  }

  const raw = readFileSync(absolutePath, 'utf-8');
  const lines = raw.split('\n');
  const start = Math.max(1, Number(startLine) || 1);
  const take = Math.max(1, Math.min(Number(maxLines) || 120, 300));
  const slice = lines.slice(start - 1, start - 1 + take);

  return {
    project: surface.key,
    projectName: surface.name,
    file: relative(root, absolutePath),
    startLine: start,
    endLine: start + slice.length - 1,
    totalLines: lines.length,
    content: slice.join('\n'),
  };
}

export function searchProjectFiles(project = 'ezboq', query = '', pathPrefix = '', maxResults = 20) {
  const needle = String(query || '').trim();
  if (!needle) return { error: 'ต้องระบุ query' };

  const normalizedPrefix = String(pathPrefix || '').trim();
  const searchDepth = normalizedPrefix ? 8 : 6;
  const listed = listProjectFiles(project, pathPrefix, searchDepth, 3000);
  if (listed.error) return listed;

  const matches = [];
  const lowerNeedle = needle.toLowerCase();
  const maxMatchCount = Math.max(1, Math.min(Number(maxResults) || 20, 50));
  const orderedEntries = [...(listed.entries || [])]
    .sort((left, right) => scoreProjectEntryForSearch(right.path, lowerNeedle) - scoreProjectEntryForSearch(left.path, lowerNeedle));

  for (const entry of orderedEntries) {
    if (matches.length >= maxMatchCount) break;

    if (entry.path?.toLowerCase().includes(lowerNeedle)) {
      matches.push({
        file: entry.path,
        line: 0,
        snippet: `[path match] ${entry.path}`,
        score: 200 + scoreProjectEntryForSearch(entry.path, lowerNeedle),
      });
      if (matches.length >= maxMatchCount) break;
    }

    const fileResolved = resolveProjectPath(project, entry.path);
    if (fileResolved.error) continue;
    if (!shouldSearchProjectFile(fileResolved.absolutePath)) continue;

    let content = '';
    try {
      content = readFileSync(fileResolved.absolutePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index++) {
      if (matches.length >= maxMatchCount) break;
      const line = lines[index];
      if (!line.toLowerCase().includes(lowerNeedle)) continue;
      matches.push({
        file: entry.path,
        line: index + 1,
        snippet: line.trim().slice(0, 220),
        score: 100 + scoreProjectEntryForSearch(entry.path, lowerNeedle) - Math.min(index, 120) / 10,
      });
    }
  }

  matches.sort((left, right) => (right.score || 0) - (left.score || 0));

  return {
    project,
    query: needle,
    count: matches.length,
    matches: matches.map(({ score, ...item }) => item),
  };
}

// ─── Self-Upgrade (Modify own knowledge) ──────────
const UPGRADE_LOG_PATH = resolve(__dirname, 'upgrade-log.json');

export function saveKnowledge(topic, content, source = 'web') {
  mem.addKnowledge(topic, content, source, 'gemma');
  logUpgrade('knowledge_add', { topic, source });
  return { status: 'saved', topic, contentLength: content.length };
}

export function searchMyKnowledge(query) {
  return mem.searchKnowledge(query);
}

export function getMyRecentKnowledge() {
  return mem.getRecentKnowledge();
}

// ─── Self-Edit (Append to soul knowledge) ────────
export function appendToSoul(section, content) {
  try {
    const soulPath = resolve(__dirname, 'soul.mjs');
    const soul = readFileSync(soulPath, 'utf-8');

    // Only allow appending to KNOWLEDGE sections
    const marker = `// === Gemma Learned (auto) ===`;
    if (!soul.includes(marker)) {
      // Add the marker before the closing of KNOWLEDGE
      const insertPoint = soul.lastIndexOf('};', soul.indexOf('SERVER_PROMPTS'));
      if (insertPoint === -1) return { error: 'Cannot find insertion point in soul.mjs' };

      const newSoul = soul.slice(0, insertPoint) +
        `\n  learned: \`# Gemma Self-Learned Knowledge\n${marker}\n${content}\`,\n` +
        soul.slice(insertPoint);
      writeFileSync(soulPath, newSoul, 'utf-8');
    } else {
      // Append to existing learned section
      const newSoul = soul.replace(marker, `${marker}\n${content}`);
      writeFileSync(soulPath, newSoul, 'utf-8');
    }

    logUpgrade('soul_append', { section, contentLength: content.length });
    return { status: 'appended', section, note: 'จะมีผลหลัง restart ค่ะ' };
  } catch (err) {
    return { error: `Soul edit error: ${err.message}` };
  }
}

// ─── Upgrade Log ─────────────────────────────────
function logUpgrade(action, details) {
  try {
    const log = existsSync(UPGRADE_LOG_PATH)
      ? JSON.parse(readFileSync(UPGRADE_LOG_PATH, 'utf-8'))
      : [];
    log.push({ action, details, timestamp: new Date().toISOString() });
    // Keep last 100 entries
    const trimmed = log.slice(-100);
    writeFileSync(UPGRADE_LOG_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch { /* ignore log errors */ }
}

export function getUpgradeLog(limit = 10) {
  try {
    if (!existsSync(UPGRADE_LOG_PATH)) return [];
    const log = JSON.parse(readFileSync(UPGRADE_LOG_PATH, 'utf-8'));
    return log.slice(-limit);
  } catch { return []; }
}
