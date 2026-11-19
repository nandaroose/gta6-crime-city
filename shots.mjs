// Capture the four hand-in screenshots from the running game, then check them.
// Node 22, standard library only: a static server for game/, headless Chrome and ffmpeg.

import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const SHOTS = resolve(fileURLToPath(new URL('./screenshots', import.meta.url)));
const PORT = 8139;
const CHROME = '/home/ubuntu/.cache/chrome-devtools/chrome/linux-158.0.8127.36/chrome-linux64/chrome';
const WIDTH = 1280;
const HEIGHT = 800;
const MAX_BYTES = 256 * 1024;

const SCENES = [
  { scene: 'start', name: '1-cover.jpg' },
  { scene: 'drive', name: '2-drive.jpg' },
  { scene: 'chase', name: '3-chase.jpg' },
  { scene: 'mission', name: '4-mission.jpg' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

function handler(request, response) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(ROOT, normalize(pathname)));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}

function startServer() {
  return new Promise((resolveServer, reject) => {
    const server = createServer(handler);
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolveServer(server));
  });
}

function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let i = 2;
  while (i + 8 < buffer.length) {
    if (buffer[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = buffer.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

const errors = [];
let server = null;
const tmp = mkdtempSync(join(tmpdir(), 'solano-shots-'));

try {
  server = await startServer();
  mkdirSync(SHOTS, { recursive: true });

  for (const { scene, name } of SCENES) {
    const png = join(tmp, scene + '.png');
    const jpg = join(SHOTS, name);
    const url = `http://127.0.0.1:${PORT}/?shot=${scene}`;
    const result = await new Promise((done) => {
      const child = spawn(CHROME, [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
        '--no-first-run',
        '--force-device-scale-factor=1',
        '--user-data-dir=' + join(tmp, 'profile-' + scene),
        `--window-size=${WIDTH},${HEIGHT}`,
        '--virtual-time-budget=8000',
        '--screenshot=' + png,
        url,
      ], { stdio: 'ignore' });
      const killer = setTimeout(() => child.kill('SIGKILL'), 60000);
      child.once('exit', (code) => {
        clearTimeout(killer);
        done({ status: code ?? 1, stderr: '', stdout: '' });
      });
      child.once('error', (err) => {
        clearTimeout(killer);
        done({ status: 1, stderr: err.message, stdout: '' });
      });
    });

    if (result.status !== 0 || !existsSync(png) || statSync(png).size === 0) {
      const detail = (result.stderr || result.stdout || '').trim().split('\n').slice(-4).join(' ');
      errors.push(`${name}: chrome failed (${result.status})${detail ? ' ' + detail : ''}`);
      continue;
    }

    const converted = spawnSync(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-i', png, '-q:v', '4', jpg],
      { encoding: 'utf8' },
    );
    if (converted.status !== 0 || !existsSync(jpg)) {
      errors.push(`${name}: ffmpeg failed (${converted.status}) ${(converted.stderr || '').trim()}`);
      continue;
    }

    const bytes = readFileSync(jpg);
    const size = bytes.length;
    const dims = jpegSize(bytes);
    const ok = size < MAX_BYTES && dims && dims.width === WIDTH && dims.height === HEIGHT;
    const dimText = dims ? `${dims.width}x${dims.height}` : 'unknown size';
    console.log(`${name}  ${size} bytes  ${dimText}`);
    if (!ok) {
      errors.push(`${name}: ${size} bytes, ${dimText} (want < ${MAX_BYTES} bytes, ${WIDTH}x${HEIGHT})`);
    }
  }
} catch (err) {
  errors.push(err instanceof Error ? err.message : String(err));
} finally {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((done) => server.close(done));
  }
  rmSync(tmp, { recursive: true, force: true });
}

if (errors.length > 0) {
  for (const message of errors) console.error('shots.mjs: ' + message);
  process.exit(1);
}
