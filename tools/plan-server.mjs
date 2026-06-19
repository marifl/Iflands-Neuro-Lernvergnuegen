#!/usr/bin/env node
// ALRAH Plan/Recap Viewer-Server — dependency-frei (nur Node-stdlib).
// Start:  node tools/plan-server.mjs        (oeffnet Browser mit Index aller Plaene)
// Listet plan.mdx unter docs/visual/ + docs/plans/ und rendert sie via tools/plan-mdx-viewer.html.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

const ROOT = process.cwd();
const VIEWER = path.join(ROOT, 'tools', 'plan-mdx-viewer.html');
const SCAN_DIRS = ['docs/visual', 'docs/plans'];

function listPlans() {
  const out = [];
  for (const d of SCAN_DIRS) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const mdx = path.join(abs, entry.name, 'plan.mdx');
      if (fs.existsSync(mdx)) out.push(path.relative(ROOT, mdx));
    }
  }
  return out.sort();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/plans') {
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(listPlans()));
  }
  if (url.pathname === '/plan') {
    const rel = url.searchParams.get('path') || '';
    const abs = path.resolve(ROOT, rel);
    if (!abs.startsWith(ROOT + path.sep) || !abs.endsWith('.mdx') || !fs.existsSync(abs)) {
      res.statusCode = 400;
      return res.end('bad path');
    }
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.end(fs.readFileSync(abs, 'utf8'));
  }
  if (!fs.existsSync(VIEWER)) {
    res.statusCode = 500;
    return res.end('tools/plan-mdx-viewer.html fehlt');
  }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(fs.readFileSync(VIEWER, 'utf8'));
});

const port = Number(process.env.PORT) || 4799;
server.listen(port, () => {
  const link = `http://localhost:${port}/`;
  console.log(`ALRAH Plan-Viewer laeuft: ${link}`);
  console.log('Beenden mit Ctrl+C.');
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} ${link}`, () => {});
});
