import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.wav': 'audio/wav' };
createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1:4174').pathname;
  if (path === '/') {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
      .replace(/<script src="https:\/\/usions.com\/usion-sdk.js"><\/script>/, '')
      .replace(/src="\.\/src\/main.js\?build=[^"]+"/, 'src="./tests/browser/replay-harness.js"');
    response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }).end(html);
    return;
  }
  const file = resolve(root, `.${decodeURIComponent(path)}`);
  if (!file.startsWith(resolve(root) + sep) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(response);
}).listen(4174, '127.0.0.1', () => console.log('Replay regression fixture: http://127.0.0.1:4174'));
