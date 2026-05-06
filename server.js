const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────
// Set these via environment variables or a .env file:
//   GITHUB_TOKEN=ghp_...
//   GITHUB_REPO=oscomarch/oscomarch.com
//   CONTENT_PATH=content.jsx          (path within the repo)
//   GITHUB_BRANCH=main                (default: main)
//
// Quick start: GITHUB_TOKEN=ghp_xxx node server.js
// ─────────────────────────────────────────────────────────────

// Load .env if present
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN  || '';
const GITHUB_REPO   = process.env.GITHUB_REPO   || 'oscomarch/oscomarch.com';
const CONTENT_PATH  = process.env.CONTENT_PATH  || 'content.jsx';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const PORT          = process.env.PORT           || 3747;

// ── GitHub API helpers ────────────────────────────────────────

function ghRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'repocraft/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch (e) { resolve({ status: res.statusCode, body: {} }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function fetchFileFromGitHub() {
  const r = await ghRequest('GET', `/repos/${GITHUB_REPO}/contents/${CONTENT_PATH}?ref=${GITHUB_BRANCH}`);
  if (r.status !== 200) throw new Error(`GitHub: ${r.body.message || r.status}`);
  const src = Buffer.from(r.body.content, 'base64').toString('utf8');
  return { src, sha: r.body.sha };
}

async function commitFileToGitHub(src, sha, message) {
  const content = Buffer.from(src, 'utf8').toString('base64');
  const r = await ghRequest('PUT', `/repos/${GITHUB_REPO}/contents/${CONTENT_PATH}`, {
    message,
    content,
    sha,
    branch: GITHUB_BRANCH,
  });
  if (r.status !== 200 && r.status !== 201) throw new Error(`GitHub: ${r.body.message || r.status}`);
  return r.body;
}

// ── Content parse / serialize ─────────────────────────────────

function parseContent(src) {
  const code = src.replace(/Object\.assign\s*\(\s*window[^)]*\)\s*;?\s*$/, '');
  // eslint-disable-next-line no-new-func
  return new Function(`${code}; return { SITE, ESSAYS, PROJECTS, EXPERIENCE, NOW, READING, CONTACT };`)();
}

function serializeContent(data) {
  const j = v => JSON.stringify(v, null, 2);
  return [
    "// Content for the site. Edit this freely — it's the easiest place to update text.\n",
    `const SITE = ${j(data.SITE)};`,
    `const ESSAYS = ${j(data.ESSAYS)};`,
    `const PROJECTS = ${j(data.PROJECTS)};`,
    `const EXPERIENCE = ${j(data.EXPERIENCE)};`,
    `const NOW = ${j(data.NOW)};`,
    `const READING = ${j(data.READING)};`,
    `const CONTACT = ${j(data.CONTACT)};`,
    'Object.assign(window, { SITE, ESSAYS, PROJECTS, EXPERIENCE, NOW, READING, CONTACT });\n',
  ].join('\n\n');
}

// ── HTTP server ───────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const json = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  // GET /api/content — fetch from GitHub and parse
  if (u.pathname === '/api/content' && req.method === 'GET') {
    try {
      if (!GITHUB_TOKEN) return json(400, { error: 'GITHUB_TOKEN not set. Add it to repocraft/.env' });
      const { src, sha } = await fetchFileFromGitHub();
      const content = parseContent(src);
      json(200, { ...content, __sha: sha });
    } catch (e) { json(500, { error: e.message }); }
    return;
  }

  // POST /api/content — serialize and commit to GitHub
  if (u.pathname === '/api/content' && req.method === 'POST') {
    try {
      if (!GITHUB_TOKEN) return json(400, { error: 'GITHUB_TOKEN not set.' });
      const body = JSON.parse(await readBody(req));
      const { __sha, ...data } = body;
      if (!__sha) return json(400, { error: 'Missing __sha — reload and try again.' });
      const src = serializeContent(data);
      const result = await commitFileToGitHub(src, __sha, 'repocraft: update content');
      json(200, { ok: true, sha: result.content?.sha });
    } catch (e) { json(500, { error: e.message }); }
    return;
  }

  // GET /api/info
  if (u.pathname === '/api/info') {
    json(200, { repo: GITHUB_REPO, branch: GITHUB_BRANCH, path: CONTENT_PATH, hasToken: !!GITHUB_TOKEN });
    return;
  }

  // Serve editor HTML
  try {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (e) { res.writeHead(404); res.end('index.html not found'); }
});

server.listen(PORT, () => {
  console.log(`\nRepocraft → http://localhost:${PORT}`);
  console.log(`Repo:   ${GITHUB_REPO} (${GITHUB_BRANCH})`);
  console.log(`File:   ${CONTENT_PATH}`);
  if (!GITHUB_TOKEN) console.log('\n⚠️  GITHUB_TOKEN not set. Add it to repocraft/.env\n');
  else console.log('Token:  ✓\n');
});
