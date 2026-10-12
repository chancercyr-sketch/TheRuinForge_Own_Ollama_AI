'use strict';
// Run this on the Mac that hosts Ollama. Cloudflare Tunnel should point to
// http://127.0.0.1:11435. Never expose Ollama's port 11434 directly.
const http = require('node:http');
const crypto = require('node:crypto');

const PORT = Number(process.env.OLLAMA_BRIDGE_PORT || 11435);
const SECRET = String(process.env.OLLAMA_SHARED_SECRET || '');
if (SECRET.length < 32) {
  console.error('Set OLLAMA_SHARED_SECRET to a random secret of at least 32 characters.');
  process.exit(1);
}

function authorized(req) {
  const header = String(req.headers.authorization || '');
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(provided);
  const b = Buffer.from(SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, service: 'ruinforge-ollama-bridge' }));
  }
  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }
  if (!authorized(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (Buffer.byteLength(body) > 128 * 1024) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request too large' }));
      req.destroy();
    }
  });
  req.on('end', async () => {
    if (res.writableEnded) return;
    let parsed;
    try { parsed = JSON.parse(body || '{}'); }
    catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
    // Only allow the expected chat operation and bound user-controlled values.
    const payload = {
      model: typeof parsed.model === 'string' ? parsed.model.slice(0, 100) : 'qwen2.5-coder:3b',
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(0, 8).map(m => ({
        role: ['system', 'user', 'assistant'].includes(m && m.role) ? m.role : 'user',
        content: String((m && m.content) || '').slice(0, 30000)
      })) : [],
      stream: false,
      options: {
        num_predict: Math.max(1, Math.min(Number(parsed.options && parsed.options.num_predict) || 3500, 7000))
      }
    };
    if (!payload.messages.length) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Messages are required' }));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const upstream = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const responseText = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(responseText);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.name === 'AbortError' ? 'Ollama timed out' : 'Cannot reach Ollama on this Mac. Is the Ollama app running?' }));
    } finally {
      clearTimeout(timeout);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`RuinForge Ollama bridge listening on http://127.0.0.1:${PORT}`);
  console.log('Keep this terminal and Ollama running while people use the website.');
});
