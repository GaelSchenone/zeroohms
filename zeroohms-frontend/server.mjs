import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5174;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UCCd0-uHBqfsmlxcQN7OcMkw';
const CACHE_TTL = 5 * 60 * 1000;

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

const API_KEY = process.env.YOUTUBE_API_KEY;
const UPLOADS_PLAYLIST = 'UU' + CHANNEL_ID.slice(2);

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

let cache = { at: 0, data: null };

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

async function fetchVideos(maxResults) {
  const perPage = Math.min(Math.max(maxResults || 12, 1), 50);
  const url =
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet' +
    `&playlistId=${UPLOADS_PLAYLIST}&maxResults=${perPage}&key=${API_KEY}`;

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    const reason = body.error?.errors?.[0]?.reason;
    if (reason === 'playlistNotFound') {
      return [];
    }
    throw Object.assign(new Error(body.error?.message || 'Error de YouTube API'), {
      status: res.status,
    });
  }

  return (body.items || []).map((item) => {
    const s = item.snippet || {};
    const thumb = s.thumbnails?.maxres || s.thumbnails?.high || s.thumbnails?.medium || s.thumbnails?.default;
    return {
      videoId: s.resourceId?.videoId || item.id,
      title: s.title || '',
      description: s.description || '',
      publishedAt: s.publishedAt || '',
      channelTitle: s.channelTitle || 'Zero Ohms',
      thumbnail: thumb?.url || '',
      url: `https://www.youtube.com/watch?v=${s.resourceId?.videoId || ''}`,
    };
  });
}

async function handleApiVideos(req, res, maxResults) {
  if (!API_KEY) {
    sendJson(res, 500, {
      error: 'Falta la variable YOUTUBE_API_KEY. Creá una key en Google Cloud Console y guardala en .env',
    });
    return;
  }
  if (Date.now() - cache.at > CACHE_TTL || !cache.data) {
    try {
      cache.data = await fetchVideos(maxResults);
      cache.at = Date.now();
    } catch (err) {
      sendJson(res, err.status || 502, { error: err.message });
      return;
    }
  }
  sendJson(res, 200, { videos: cache.data });
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

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/videos') {
    const maxResults = Number(url.searchParams.get('maxResults')) || 12;
    await handleApiVideos(req, res, maxResults);
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, channelId: CHANNEL_ID });
    return;
  }
  await serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`ZeroOhms server escuchando en http://localhost:${PORT}`);
  console.log(`Canal: ${CHANNEL_ID} | Playlist uploads: ${UPLOADS_PLAYLIST}`);
  if (!API_KEY) console.log('AVISO: falta YOUTUBE_API_KEY (ver .env)');
});
