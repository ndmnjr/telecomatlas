import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
export async function serve(port = 4173, requests = []) {
  const server = http.createServer(async (req, res) => {
    let status = 200;
    try {
      const url = new URL(req.url, 'http://127.0.0.1'),
        file = path.resolve(
          root,
          '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
        );
      if (!file.startsWith(root + path.sep)) throw Error('Outside build');
      const b = await fs.readFile(file);
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.glb': 'model/gltf-binary',
      };
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(b);
    } catch {
      status = 404;
      res.writeHead(404);
      res.end('Not found');
    }
    requests.push({ url: req.url, status });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serve();
  console.log('Telecom Atlas: http://127.0.0.1:4173/');
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => server.close(() => process.exit()));
}
