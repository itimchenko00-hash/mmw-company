const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 10000;
const HOST = '0.0.0.0';
const ROOT = __dirname;
const INDEX = path.join(ROOT, 'index.html');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (!req.url) return send(res, 400, 'text/plain; charset=utf-8', 'Bad Request');

  const requestPath = decodeURIComponent(req.url.split('?')[0]);
  if (requestPath === '/health' || requestPath === '/healthz') {
    return send(res, 200, 'text/plain; charset=utf-8', 'ok');
  }

  let filePath = path.join(ROOT, requestPath === '/' ? 'index.html' : requestPath);
  if (!filePath.startsWith(ROOT)) {
    return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      const type = mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      return fs.createReadStream(filePath).on('error', () => {
        send(res, 500, 'text/plain; charset=utf-8', 'Internal Server Error');
      }).pipe(res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' }));
    }

    // SPA-style fallback: all unknown routes render the same ALADIN page.
    fs.createReadStream(INDEX).on('error', () => {
      send(res, 500, 'text/plain; charset=utf-8', 'ALADIN index.html is unavailable');
    }).pipe(res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`ALADIN server listening on ${HOST}:${PORT}`);
});
