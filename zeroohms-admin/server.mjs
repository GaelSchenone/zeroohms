import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5176;

const envPath = path.join(__dirname, '.env');
if (existsSync(envPath)) {
  const env = await readFile(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function serveStatic(res, pathname) {
  const distDir = path.join(__dirname, 'dist');
  if (!existsSync(distDir)) {
    sendJson(res, 404, { error: 'No hay build en dist/. Corré npm run build.' });
    return;
  }
  let file = pathname === '/' ? '/index.html' : pathname;
  let full = path.join(distDir, file);
  if (!full.startsWith(distDir)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(full) && (await readFile(full).catch(() => null)) !== null) {
    // keep
  } else {
    full = path.join(distDir, 'index.html');
  }
  const ext = path.extname(full).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(await readFile(full));
}

function proxyToBackend(req, res) {
  const backend = new URL(BACKEND_URL);
  const request = backend.protocol === 'https:' ? httpsRequest : httpRequest;
  const proxyReq = request({
    hostname: backend.hostname,
    port: backend.port || (backend.protocol === 'https:' ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: backend.host },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend no disponible' }));
  });
  req.pipe(proxyReq);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    proxyToBackend(req, res);
    return;
  }
  await serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`ZeroOhms admin escuchando en http://localhost:${PORT}`);
  console.log(`Backend: ${BACKEND_URL}`);
});
