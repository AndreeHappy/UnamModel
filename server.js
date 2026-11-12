import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PORT = Number(process.env.PORT) || 5173;
const ROOT = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg']);

const server = http.createServer((req, res) => {
  const rawUrl = decodeURIComponent((req.url || '/').split('?')[0]);
  const relPath = rawUrl === '/' ? 'index.html' : rawUrl.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, relPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acceso denegado');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado: ' + rawUrl);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const isImmutable = relPath.startsWith('vendor/') || relPath.startsWith('multimedia/');
    const headers = {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': isImmutable ? 'public, max-age=86400' : 'no-cache',
    };
    const acceptEnc = req.headers['accept-encoding'] || '';
    if (COMPRESSIBLE_EXTS.has(ext) && /\bgzip\b/i.test(acceptEnc)) {
      zlib.gzip(data, (zErr, gzData) => {
        if (zErr) {
          res.writeHead(200, headers);
          res.end(data);
          return;
        }
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(gzData);
      });
      return;
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n✓ El servidor ya está activo en: http://localhost:${PORT}\n`);
    process.exit(0);
  }
  console.error(err);
});

server.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`  SEDE ADMINISTRATIVA UNAM 3D (120 FPS) — SERVIDOR ACTIVO`);
  console.log(`  Abre en tu navegador: http://localhost:${PORT}`);
  console.log(`=============================================================\n`);
});
