import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('build');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    let data, type;
    try {
      data = await readFile(file);
      type = types[extname(file)] || 'application/octet-stream';
    } catch {
      if (extname(pathname)) {
        res.writeHead(404).end();
        return;
      }
      data = await readFile(resolve(root, 'index.html'));
      type = 'text/html';
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500).end();
  }
}).listen(4178, '127.0.0.1');
