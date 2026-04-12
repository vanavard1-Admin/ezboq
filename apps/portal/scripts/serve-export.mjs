import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const args = process.argv.slice(2);

function getArg(flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const host = getArg('--host', '127.0.0.1');
const port = Number(getArg('--port', '3401'));
const rootDir = path.resolve(getArg('--root', 'out'));

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=UTF-8'],
  ['.html', 'text/html; charset=UTF-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=UTF-8'],
  ['.json', 'application/json; charset=UTF-8'],
  ['.map', 'application/json; charset=UTF-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=UTF-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=UTF-8'],
]);

function resolveFile(urlPath) {
  const normalized = decodeURIComponent(urlPath.split('?')[0] || '/');
  const trimmed = normalized.replace(/^\/+/, '');
  const clean = trimmed.replace(/\/+$/, '');
  const candidates = [];

  if (!clean) {
    candidates.push('index.html');
  } else {
    candidates.push(trimmed);
    candidates.push(clean);
    candidates.push(`${clean}.html`);
    candidates.push(path.join(clean, 'index.html'));
  }

  for (const candidate of candidates) {
    const absolute = path.resolve(rootDir, candidate);
    if (!absolute.startsWith(rootDir)) continue;
    if (!fs.existsSync(absolute)) continue;
    if (!fs.statSync(absolute).isFile()) continue;
    return absolute;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const filePath = resolveFile(req.url || '/');
  const method = req.method || 'GET';

  if (!filePath) {
    const notFoundFile = path.resolve(rootDir, '404.html');
    if (fs.existsSync(notFoundFile)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      if (method !== 'HEAD') {
        fs.createReadStream(notFoundFile).pipe(res);
      } else {
        res.end();
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES.get(ext) || 'application/octet-stream';
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    'Content-Length': stat.size,
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });

  if (method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[serve-export] serving ${rootDir} on http://${host}:${port}`);
});
